import type { PostAuthenticationTriggerHandler } from "aws-lambda";
import { dynamoClient } from "../backend/lib/dynamoClient";
import type { InvitationItem } from "../shared/types";

/**
 * Check if a LINE user ID has an accepted invitation in DynamoDB
 */
async function isUserAuthorized(lineUserId: string): Promise<boolean> {
  try {
    // Query all invitations from GSI1
    const invitations = await dynamoClient.query<InvitationItem>(
      "GSI1",
      "GSI1PK = :gsi1pk",
      { ":gsi1pk": "INVITATIONS" },
    );

    // Check if any accepted invitation matches this LINE user ID
    const hasAcceptedInvitation = invitations.some(
      (invitation) =>
        invitation.Status === "accepted" &&
        invitation.AcceptedBy === lineUserId,
    );

    console.log(
      `Authorization check for LINE user ${lineUserId}: ${hasAcceptedInvitation}`,
    );
    return hasAcceptedInvitation;
  } catch (error) {
    console.error("Error checking user authorization:", error);
    // Fail closed - deny access if we can't verify
    return false;
  }
}

export const handler: PostAuthenticationTriggerHandler = async (event) => {
  console.log("PostAuthentication event:", JSON.stringify(event, null, 2));

  const identities = event.request.userAttributes?.identities;
  const parsedIds = JSON.parse(identities);
  const userId = parsedIds[0].userId;
  console.log("Extracted LINE user ID from identities:", userId);

  if (!userId) {
    console.error("Authentication failed: No LINE user ID found");
    throw new Error("Unauthorized user - No LINE user ID");
  }

  // Check if user has an accepted invitation
  const isAuthorized = await isUserAuthorized(userId);

  if (!isAuthorized) {
    console.error(
      `Authentication failed for LINE user ID: ${userId} - No accepted invitation found`,
    );
    throw new Error("Unauthorized user - No valid invitation");
  }

  console.log(`Authentication successful for LINE user ID: ${userId}`);
  return event;
};
