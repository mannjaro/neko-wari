# Migration Guide: User Display Names to LINE User IDs

This guide explains how to migrate existing cost data from hardcoded display names ("****", "****") to LINE user IDs.

## Overview

The migration script updates all `CostDataItem.User` fields that contain legacy display names and replaces them with the corresponding LINE user IDs from accepted invitations.

## Prerequisites

1. **AWS Credentials**: Ensure AWS credentials are configured
   - Set `AWS_PROFILE` environment variable, or
   - Use default AWS credentials

2. **Table Name**: Know your DynamoDB table name

3. **Dependencies**: Install required packages
   ```bash
   npm install
   ```

## Running the Migration

### 1. Dry Run (Preview Changes)

First, run in dry-run mode to preview what will be changed without actually modifying data:

```bash
TABLE_NAME=your-table-name npm run migrate:users -- --dry-run
```

Example output:
```
🚀 LINE Bot User Migration Script
=====================================

⚠️  DRY RUN MODE - No changes will be applied

📊 Table: LineBotStack-BackendTableXXXXXX
🌍 Region: us-east-1

📥 Fetching accepted invitations...
✅ Found 2 accepted invitation(s)

📥 Scanning for cost data with legacy display names: ****, ****...
✅ Found 45 cost data item(s) to migrate

📋 Display name to LINE user ID mapping:
  **** → Uxxxxxxxxxxxxxxxxxxxx1
  **** → Uxxxxxxxxxxxxxxxxxxxx2

📋 Migration Summary:
  Total cost data items to process: 45
  Items that can be mapped: 45
  Items that will be skipped: 0

  [DRY RUN] Updating USER#Uxxxxx/COST#1234567890: "****" → "Uxxxxxxxxxxxxxxxxxxxx1"
  ...

✅ Migration complete!
  ✓ Successfully would update: 45
```

### 2. Run Actual Migration

After reviewing the dry-run output, execute the actual migration:

```bash
TABLE_NAME=your-table-name npm run migrate:users
```

You will be prompted for confirmation:
```
⚠️  This will update the database. Do you want to continue? (y/n):
```

Type `y` and press Enter to proceed.

## What the Script Does

1. **Fetches Accepted Invitations**: Queries DynamoDB for all accepted invitations
2. **Builds Mapping**: Creates a map from display names to LINE user IDs
3. **Scans Cost Data**: Finds all cost items with legacy display names
4. **Validates**: Checks that all display names have corresponding LINE user IDs
5. **Updates**: Updates each cost item's `User` field with the LINE user ID
6. **Logs Progress**: Shows detailed progress and summary

## Safety Features

- **Dry-run mode**: Preview changes without modifications
- **Confirmation prompt**: Requires explicit confirmation before updating
- **Validation**: Skips items without valid mappings
- **Error handling**: Continues processing even if individual updates fail
- **Detailed logging**: Shows exactly what is being changed

## Troubleshooting

### Error: TABLE_NAME environment variable is not set
```bash
# Make sure to set the TABLE_NAME
export TABLE_NAME=your-table-name
npm run migrate:users
```

### Warning: No LINE user ID found for display name
- This means an accepted invitation doesn't exist for that display name
- Items with that display name will be skipped
- Verify users have accepted their invitations

### Error: No accepted invitations found
- Ensure users have registered via the invitation system
- Check that invitations have `Status: "accepted"`

## Rollback

If you need to rollback the migration:

1. You'll need to restore from a DynamoDB backup
2. Or manually update the affected items back to display names

**Recommendation**: Always run with `--dry-run` first and verify the output before running the actual migration.

## Post-Migration Verification

After migration, verify the changes:

```bash
# Check that cost data now uses LINE user IDs
aws dynamodb scan \
  --table-name your-table-name \
  --filter-expression "EntityType = :type AND begins_with(#user, :prefix)" \
  --expression-attribute-names '{"#user":"User"}' \
  --expression-attribute-values '{":type":{"S":"COST_DATA"},":prefix":{"S":"U"}}' \
  --select COUNT
```

## Next Steps

After successful migration:

1. Deploy the updated Lambda functions with the new user selection logic
2. Test the LINE bot user selection flow
3. Verify dashboard displays user data correctly with the new user IDs
4. Monitor for any issues in the first few days
