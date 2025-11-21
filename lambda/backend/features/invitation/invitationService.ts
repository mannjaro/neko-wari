import { Logger } from "@aws-lambda-powertools/logger";
import { randomBytes } from "node:crypto";
import type {
  InvitationItem,
  InvitationStatus,
  InvitationResponse,
} from "../../../shared/types";
import {
  DYNAMO_KEYS,
  INVITATION_TTL_SECONDS,
  INVITATION_TOKEN_LENGTH,
} from "../../../shared/constants";
import { dynamoClient } from "../../lib/dynamoClient";

const logger = new Logger({ serviceName: "invitationService" });

/**
 * Service for invitation management
 */
export class InvitationService {
  /**
   * Generate a secure random token for invitation URL
   */
  private generateToken(): string {
    return randomBytes(INVITATION_TOKEN_LENGTH).toString("hex");
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    createdBy: string,
    expirationHours: number = 168,
    metadata?: Record<string, unknown>,
  ): Promise<InvitationResponse> {
    try {
      const now = new Date();
      const invitationId = `${Date.now()}-${randomBytes(8).toString("hex")}`;
      const token = this.generateToken();
      const expiresAt = new Date(
        now.getTime() + expirationHours * 60 * 60 * 1000,
      );
      const ttl = Math.floor(expiresAt.getTime() / 1000);

      const invitationItem: InvitationItem = {
        PK: `${DYNAMO_KEYS.INVITATION_PREFIX}${invitationId}`,
        SK: "INVITATION#MAIN",
        GSI1PK: DYNAMO_KEYS.INVITATIONS_GSI,
        GSI1SK: `STATUS#pending#${now.toISOString()}`,
        EntityType: "INVITATION",
        CreatedAt: now.toISOString(),
        UpdatedAt: now.toISOString(),
        InvitationId: invitationId,
        Token: token,
        Status: "pending",
        CreatedBy: createdBy,
        ExpiresAt: expiresAt.toISOString(),
        Metadata: metadata,
        TTL: ttl,
      };

      await dynamoClient.put<InvitationItem>(invitationItem);

      // Construct invitation URL (will be configured via environment variable)
      const baseUrl = process.env.INVITATION_BASE_URL || "";
      const invitationUrl = `${baseUrl}/invitation/${token}`;

      logger.info("Invitation created", { invitationId, token, expiresAt });

      return {
        invitationId,
        token,
        invitationUrl,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      logger.error("Error creating invitation", { error, createdBy });
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<InvitationItem | null> {
    try {
      logger.info("Looking up invitation by token", { token });

      // Query GSI to find invitation by token
      const result = await dynamoClient.query<InvitationItem>(
        "GSI1",
        "GSI1PK = :gsi1pk",
        {
          ":gsi1pk": DYNAMO_KEYS.INVITATIONS_GSI,
        },
      );

      logger.info("Query result", {
        resultCount: result.length,
        tokens: result.map((item) => item.Token),
      });

      // Filter by token in memory (not ideal for production, consider adding GSI on Token)
      const invitation = result.find((item) => item.Token === token);

      if (invitation) {
        logger.info("Invitation found", {
          invitationId: invitation.InvitationId,
        });
      } else {
        logger.warn("Invitation not found", {
          token,
          availableTokens: result.map((item) => item.Token),
        });
      }

      return invitation || null;
    } catch (error) {
      logger.error("Error getting invitation by token", { error, token });
      return null;
    }
  }

  /**
   * Validate invitation (check if it's valid and not expired)
   */
  async validateInvitation(token: string): Promise<{
    valid: boolean;
    invitation?: InvitationItem;
    reason?: string;
  }> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      return { valid: false, reason: "Invitation not found" };
    }

    if (invitation.Status !== "pending") {
      return {
        valid: false,
        invitation,
        reason: `Invitation already ${invitation.Status}`,
      };
    }

    const now = new Date();
    const expiresAt = new Date(invitation.ExpiresAt);

    if (now > expiresAt) {
      // Mark as expired
      await this.updateInvitationStatus(invitation.InvitationId, "expired");
      return { valid: false, invitation, reason: "Invitation expired" };
    }

    return { valid: true, invitation };
  }

  /**
   * Check if a LINE user has already accepted any invitation
   */
  async checkUserAlreadyRegistered(
    lineUserId: string,
  ): Promise<InvitationItem | null> {
    try {
      logger.info("Checking if user already registered", { lineUserId });

      // Query all accepted invitations
      const acceptedInvitations = await this.listInvitations(
        undefined,
        "accepted",
      );

      // Find if this LINE user has already accepted an invitation
      const existingInvitation = acceptedInvitations.find(
        (invitation) => invitation.AcceptedBy === lineUserId,
      );

      if (existingInvitation) {
        logger.info("User already registered", {
          lineUserId,
          invitationId: existingInvitation.InvitationId,
        });
        return existingInvitation;
      }

      return null;
    } catch (error) {
      logger.error("Error checking user registration", { error, lineUserId });
      return null;
    }
  }

  /**
   * Accept invitation with LINE user information
   */
  async acceptInvitationWithLineId(
    token: string,
    lineUserId: string,
    displayName: string,
    pictureUrl?: string,
  ): Promise<InvitationItem> {
    try {
      // Check if user is already registered
      const existingInvitation =
        await this.checkUserAlreadyRegistered(lineUserId);
      if (existingInvitation) {
        logger.warn("User already registered, rejecting invitation", {
          lineUserId,
          existingInvitationId: existingInvitation.InvitationId,
          newToken: token,
        });
        throw new Error("USER_ALREADY_REGISTERED");
      }

      const validation = await this.validateInvitation(token);

      if (!validation.valid || !validation.invitation) {
        throw new Error(validation.reason || "Invalid invitation");
      }

      const invitation = validation.invitation;
      const now = new Date().toISOString();
      const pk = invitation.PK;
      const sk = invitation.SK;

      // Build update expression to set accepted fields and remove TTL
      const updateExpression = pictureUrl
        ? "SET #status = :status, AcceptedBy = :acceptedBy, AcceptedDisplayName = :displayName, AcceptedPictureUrl = :pictureUrl, AcceptedAt = :acceptedAt, UpdatedAt = :updatedAt, GSI1SK = :gsi1sk REMOVE #ttl"
        : "SET #status = :status, AcceptedBy = :acceptedBy, AcceptedDisplayName = :displayName, AcceptedAt = :acceptedAt, UpdatedAt = :updatedAt, GSI1SK = :gsi1sk REMOVE #ttl";

      const expressionAttributeNames = {
        "#status": "Status",
        "#ttl": "TTL",
      };

      const expressionAttributeValues: Record<string, unknown> = {
        ":status": "accepted",
        ":acceptedBy": lineUserId,
        ":displayName": displayName,
        ":acceptedAt": now,
        ":updatedAt": now,
        ":gsi1sk": `STATUS#accepted#${now}`,
      };

      if (pictureUrl) {
        expressionAttributeValues[":pictureUrl"] = pictureUrl;
      }

      // Update invitation and remove TTL
      const updatedInvitation = await dynamoClient.update<InvitationItem>(
        pk,
        sk,
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      );

      logger.info("Invitation accepted and TTL removed", {
        invitationId: invitation.InvitationId,
        lineUserId,
        displayName,
        hasTTL: updatedInvitation.TTL !== undefined,
      });

      return updatedInvitation;
    } catch (error) {
      logger.error("Error accepting invitation", { error, token, lineUserId });
      throw error;
    }
  }

  /**
   * Update invitation status
   */
  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<void> {
    try {
      const pk = `${DYNAMO_KEYS.INVITATION_PREFIX}${invitationId}`;
      const sk = "INVITATION#MAIN";
      const now = new Date().toISOString();

      await dynamoClient.update(
        pk,
        sk,
        "SET #status = :status, UpdatedAt = :updatedAt, GSI1SK = :gsi1sk",
        {
          "#status": "Status",
        },
        {
          ":status": status,
          ":updatedAt": now,
          ":gsi1sk": `STATUS#${status}#${now}`,
        },
      );

      logger.info("Invitation status updated", { invitationId, status });
    } catch (error) {
      logger.error("Error updating invitation status", {
        error,
        invitationId,
        status,
      });
      throw error;
    }
  }

  /**
   * List invitations with optional filters
   */
  async listInvitations(
    createdBy?: string,
    status?: InvitationStatus,
  ): Promise<InvitationItem[]> {
    try {
      const result = await dynamoClient.query<InvitationItem>(
        "GSI1",
        "GSI1PK = :gsi1pk",
        {
          ":gsi1pk": DYNAMO_KEYS.INVITATIONS_GSI,
        },
      );

      // Filter in memory
      let filteredResults = result;

      if (createdBy) {
        filteredResults = filteredResults.filter(
          (item) => item.CreatedBy === createdBy,
        );
      }

      if (status) {
        filteredResults = filteredResults.filter(
          (item) => item.Status === status,
        );
      }

      return filteredResults;
    } catch (error) {
      logger.error("Error listing invitations", { error, createdBy, status });
      return [];
    }
  }

  /**
   * Revoke (expire) an invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    await this.updateInvitationStatus(invitationId, "expired");
  }

  /**
   * Update display name for a user (by LINE user ID)
   */
  async updateDisplayName(
    lineUserId: string,
    displayName: string,
  ): Promise<InvitationItem> {
    try {
      logger.info("Updating display name", { lineUserId, displayName });

      // Find the accepted invitation for this LINE user
      const acceptedInvitations = await this.listInvitations(
        undefined,
        "accepted",
      );
      const invitation = acceptedInvitations.find(
        (inv) => inv.AcceptedBy === lineUserId,
      );

      if (!invitation) {
        throw new Error("User not found");
      }

      const now = new Date().toISOString();
      const pk = invitation.PK;
      const sk = invitation.SK;

      // Update the display name
      const updatedInvitation = await dynamoClient.update<InvitationItem>(
        pk,
        sk,
        "SET #AcceptedDisplayName = :displayName, #UpdatedAt = :updatedAt",
        {
          "#AcceptedDisplayName": "AcceptedDisplayName",
          "#UpdatedAt": "UpdatedAt",
        },
        {
          ":displayName": displayName,
          ":updatedAt": now,
        },
      );

      logger.info("Display name updated", {
        lineUserId,
        displayName,
        invitationId: invitation.InvitationId,
      });

      return updatedInvitation;
    } catch (error) {
      logger.error("Error updating display name", {
        error,
        lineUserId,
        displayName,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const invitationService = new InvitationService();
