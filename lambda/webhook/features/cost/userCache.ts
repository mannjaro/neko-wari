import { Logger } from "@aws-lambda-powertools/logger";
import { invitationService } from "../../../backend/features/invitation/invitationService";

const logger = new Logger({ serviceName: "userCache" });

export interface AcceptedUser {
  lineUserId: string;
  displayName: string;
}

// Simple module-level cache that persists across Lambda invocations in the same execution context
let cachedUsers: AcceptedUser[] | null = null;

/**
 * Get list of accepted users from invitations with simple caching
 * Cache persists across Lambda invocations in the same execution context
 */
export async function getAcceptedUsers(): Promise<AcceptedUser[]> {
  // Return cached value if available
  if (cachedUsers !== null) {
    logger.debug("Returning cached users", { count: cachedUsers.length });
    return cachedUsers;
  }

  try {
    logger.info("Fetching accepted users from invitations");

    // Fetch all accepted invitations
    const invitations = await invitationService.listInvitations(
      undefined,
      "accepted",
    );

    // Map to user format, filtering out any invalid entries
    cachedUsers = invitations
      .filter(
        (invitation) => invitation.AcceptedBy && invitation.AcceptedDisplayName,
      )
      .map((invitation) => ({
        lineUserId: invitation.AcceptedBy as string,
        displayName: invitation.AcceptedDisplayName as string,
      }));

    logger.info("Cached accepted users", { count: cachedUsers.length });

    return cachedUsers;
  } catch (error) {
    logger.error("Error fetching accepted users", { error });
    // Return empty array on error to prevent crashes
    return [];
  }
}

/**
 * Clear the user cache (useful for testing or manual cache invalidation)
 */
export function clearUserCache(): void {
  logger.info("Clearing user cache");
  cachedUsers = null;
}
