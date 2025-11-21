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
