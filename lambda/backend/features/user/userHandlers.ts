import { Logger } from "@aws-lambda-powertools/logger";
import type { Context } from "hono";
import { invitationService } from "../invitation/invitationService";

const logger = new Logger({ serviceName: "userHandlers" });

/**
 * Handler for listing all registered users (accepted invitations)
 */
export async function listUsersHandler(c: Context) {
  try {
    // Get all accepted invitations
    const invitations = await invitationService.listInvitations(
      undefined,
      "accepted",
    );

    // Transform to user list format
    const users = invitations.map((invitation) => ({
      id: invitation.AcceptedBy || "",
      lineUserId: invitation.AcceptedBy || "",
      displayName: invitation.AcceptedDisplayName || "Unknown",
      pictureUrl: invitation.AcceptedPictureUrl,
      acceptedAt: invitation.AcceptedAt || "",
      invitationId: invitation.InvitationId,
      createdBy: invitation.CreatedBy,
    }));

    logger.info("Users listed", { count: users.length });

    return c.json({ users });
  } catch (error) {
    logger.error("Error in listUsersHandler", { error });
    return c.json({ error: "Failed to list users" }, 500);
  }
}

/**
 * Handler for updating user display name
 */
export async function updateDisplayNameHandler(
  c: Context,
  lineUserId: string,
  displayName: string,
) {
  try {
    logger.info("Updating display name", { lineUserId, displayName });

    // Update the display name
    const updatedInvitation = await invitationService.updateDisplayName(
      lineUserId,
      displayName,
    );

    // Return updated user data
    const user = {
      id: updatedInvitation.AcceptedBy || "",
      lineUserId: updatedInvitation.AcceptedBy || "",
      displayName: updatedInvitation.AcceptedDisplayName || "Unknown",
      pictureUrl: updatedInvitation.AcceptedPictureUrl,
      acceptedAt: updatedInvitation.AcceptedAt || "",
      invitationId: updatedInvitation.InvitationId,
      createdBy: updatedInvitation.CreatedBy,
    };

    logger.info("Display name updated successfully", { lineUserId, user });

    return c.json({ user });
  } catch (error) {
    logger.error("Error in updateDisplayNameHandler", { error, lineUserId });
    if (error instanceof Error && error.message === "User not found") {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({ error: "Failed to update display name" }, 500);
  }
}
