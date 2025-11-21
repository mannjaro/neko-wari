#!/usr/bin/env tsx
/**
 * Migration script to update CostDataItem.User field from display names
 * (e.g., "****", "****") to LINE user IDs from accepted invitations
 *
 * Usage:
 *   npm run migrate:users              # Run migration
 *   npm run migrate:users -- --dry-run # Preview changes without applying
 *
 * Requirements:
 *   - AWS credentials configured (AWS_PROFILE or default credentials)
 *   - TABLE_NAME environment variable set to DynamoDB table name
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import * as readline from "node:readline";

// Configuration
const TABLE_NAME = process.env.TABLE_NAME;
const DRY_RUN = process.argv.includes("--dry-run");
const REGION = process.env.AWS_REGION || "us-east-1";

// Hardcoded display names to migrate
const LEGACY_DISPLAY_NAMES = ["****", "****"];

interface InvitationItem {
  PK: string;
  SK: string;
  EntityType: string;
  Status: string;
  AcceptedBy?: string;
  AcceptedDisplayName?: string;
}

interface CostDataItem {
  PK: string;
  SK: string;
  EntityType: string;
  User: string;
  Category: string;
  Memo: string;
  Price: number;
  Timestamp: number;
  YearMonth: string;
}

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Fetch all accepted invitations
 */
async function fetchAcceptedInvitations(): Promise<InvitationItem[]> {
  console.log("📥 Fetching accepted invitations...");

  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "EntityType = :entityType AND #status = :status",
    ExpressionAttributeNames: {
      "#status": "Status",
    },
    ExpressionAttributeValues: {
      ":entityType": "INVITATION",
      ":status": "accepted",
    },
  };

  const result = await docClient.send(new ScanCommand(params));
  const invitations = (result.Items || []) as InvitationItem[];

  console.log(`✅ Found ${invitations.length} accepted invitation(s)`);
  return invitations;
}

/**
 * Fetch all cost data items with legacy display names
 */
async function fetchLegacyCostData(): Promise<CostDataItem[]> {
  console.log(
    `\n📥 Scanning for cost data with legacy display names: ${LEGACY_DISPLAY_NAMES.join(", ")}...`,
  );

  const params = {
    TableName: TABLE_NAME,
    FilterExpression:
      "EntityType = :entityType AND #user IN (:displayName1, :displayName2)",
    ExpressionAttributeNames: {
      "#user": "User",
    },
    ExpressionAttributeValues: {
      ":entityType": "COST_DATA",
      ":displayName1": LEGACY_DISPLAY_NAMES[0],
      ":displayName2": LEGACY_DISPLAY_NAMES[1],
    },
  };

  const result = await docClient.send(new ScanCommand(params));
  const costData = (result.Items || []) as CostDataItem[];

  console.log(`✅ Found ${costData.length} cost data item(s) to migrate`);
  return costData;
}

/**
 * Build mapping from display names to LINE user IDs
 */
function buildDisplayNameMapping(
  invitations: InvitationItem[],
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const invitation of invitations) {
    if (invitation.AcceptedDisplayName && invitation.AcceptedBy) {
      mapping.set(invitation.AcceptedDisplayName, invitation.AcceptedBy);
    }
  }

  console.log("\n📋 Display name to LINE user ID mapping:");
  for (const [displayName, lineUserId] of mapping.entries()) {
    console.log(`  ${displayName} → ${lineUserId}`);
  }

  return mapping;
}

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Update cost data items with new LINE user IDs
 */
async function migrateCostData(
  costData: CostDataItem[],
  mapping: Map<string, string>,
): Promise<void> {
  console.log(
    `\n🔄 ${DRY_RUN ? "[DRY RUN] " : ""}Starting migration of ${costData.length} item(s)...`,
  );

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const item of costData) {
    const newUserId = mapping.get(item.User);

    if (!newUserId) {
      console.log(
        `⚠️  Skipping ${item.PK}/${item.SK}: No mapping found for "${item.User}"`,
      );
      skipCount++;
      continue;
    }

    console.log(
      `  ${DRY_RUN ? "[DRY RUN] " : ""}Updating ${item.PK}/${item.SK}: "${item.User}" → "${newUserId}"`,
    );

    if (!DRY_RUN) {
      try {
        const params = {
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
          UpdateExpression: "SET #user = :newUserId, UpdatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#user": "User",
          },
          ExpressionAttributeValues: {
            ":newUserId": newUserId,
            ":updatedAt": new Date().toISOString(),
          },
        };

        await docClient.send(new UpdateCommand(params));
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating ${item.PK}/${item.SK}:`, error);
        errorCount++;
      }
    } else {
      successCount++;
    }
  }

  console.log("\n✅ Migration complete!");
  console.log(`  ✓ Successfully ${DRY_RUN ? "would update" : "updated"}: ${successCount}`);
  if (skipCount > 0) {
    console.log(`  ⚠️  Skipped: ${skipCount}`);
  }
  if (errorCount > 0) {
    console.log(`  ❌ Errors: ${errorCount}`);
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log("🚀 LINE Bot User Migration Script");
  console.log("=====================================\n");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be applied\n");
  }

  if (!TABLE_NAME) {
    console.error("❌ Error: TABLE_NAME environment variable is not set");
    console.error("\nUsage: TABLE_NAME=your-table-name npm run migrate:users");
    process.exit(1);
  }

  console.log(`📊 Table: ${TABLE_NAME}`);
  console.log(`🌍 Region: ${REGION}\n`);

  try {
    // Fetch data
    const invitations = await fetchAcceptedInvitations();
    const costData = await fetchLegacyCostData();

    if (invitations.length === 0) {
      console.error(
        "\n❌ Error: No accepted invitations found. Cannot build mapping.",
      );
      process.exit(1);
    }

    if (costData.length === 0) {
      console.log(
        "\n✅ No cost data items found with legacy display names. Nothing to migrate.",
      );
      process.exit(0);
    }

    // Build mapping
    const mapping = buildDisplayNameMapping(invitations);

    // Check if all legacy names have mappings
    const missingMappings = LEGACY_DISPLAY_NAMES.filter(
      (name) => !mapping.has(name),
    );
    if (missingMappings.length > 0) {
      console.warn(
        `\n⚠️  Warning: No LINE user ID found for: ${missingMappings.join(", ")}`,
      );
      console.warn(
        "   Cost data items with these names will be skipped.",
      );
    }

    // Preview changes
    console.log("\n📋 Migration Summary:");
    console.log(`  Total cost data items to process: ${costData.length}`);
    const mappedCount = costData.filter((item) => mapping.has(item.User))
      .length;
    console.log(`  Items that can be mapped: ${mappedCount}`);
    console.log(`  Items that will be skipped: ${costData.length - mappedCount}`);

    // Prompt for confirmation (unless dry run)
    if (!DRY_RUN) {
      const confirmed = await promptConfirmation(
        "\n⚠️  This will update the database. Do you want to continue?",
      );
      if (!confirmed) {
        console.log("\n❌ Migration cancelled by user");
        process.exit(0);
      }
    }

    // Run migration
    await migrateCostData(costData, mapping);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
