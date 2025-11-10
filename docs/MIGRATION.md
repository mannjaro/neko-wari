# User ID Migration Guide

## Overview

This document describes the migration process for the unified user ID system. The new system uses a canonical user ID (Cognito sub) consistently across both frontend and webhook (LINE Bot) registration methods.

## Changes

### Before
- **Frontend**: Uses manually entered user names (e.g., "あやね", "たかゆき") as user IDs
- **Webhook**: Uses LINE user IDs (e.g., "U1234567890abc...") as user IDs
- **Problem**: Same person gets different IDs depending on registration method

### After
- **Frontend**: Uses Cognito user ID (sub from JWT token) as canonical user ID
- **Webhook**: Maps LINE user ID to canonical user ID via user mapping table
- **Benefit**: Same user receives consistent ID across both registration methods

## Database Schema Changes

### New Entity: USER_MAPPING

```typescript
{
  PK: "USER_MAPPING#{cognitoUserId}",
  SK: "PROFILE#MAIN",
  GSI1PK: "LINE_USER#{lineUserId}",     // Optional, only if linked
  GSI1SK: "USER_MAPPING",                // Optional, only if linked
  EntityType: "USER_MAPPING",
  CognitoUserId: string,                 // Canonical user ID
  LineUserId?: string,                   // Optional LINE user ID
  DisplayName: string,                   // User's display name
  Email?: string,                        // User's email from Cognito
  CreatedAt: string,
  UpdatedAt: string
}
```

### Modified: COST_DATA

The COST_DATA entity structure remains the same, but now:
- `PK` (`USER#{userId}`) uses canonical user ID (Cognito sub or LINE user ID)
- `User` field stores the display name (from user mapping)

## Migration Steps

### Step 1: Identify Existing Users

Existing users in the system fall into three categories:

1. **Frontend-only users**: Users who only created entries via the dashboard
   - User IDs are display names (e.g., "あやね", "たかゆき")
   - Need to be linked to Cognito accounts

2. **Webhook-only users**: Users who only created entries via LINE Bot
   - User IDs are LINE user IDs (e.g., "U1234567890abc...")
   - Already have proper IDs, need user mappings created

3. **Both**: Users who created entries via both methods
   - Currently have duplicate data under different IDs
   - Need to merge data and create proper mappings

### Step 2: Migration Script

A migration script should:

1. Query all existing COST_DATA items
2. Extract unique user IDs from PK fields
3. For each user ID:
   - If it's a UUID format → already migrated, skip
   - If it matches LINE user ID format (starts with "U") → create user mapping
   - If it's a display name → needs manual mapping to Cognito user

### Step 3: Manual User Linking (For Display Names)

For existing display name users (e.g., "あやね", "たかゆき"):

1. User logs in to the dashboard via Cognito
2. System checks if a user mapping exists for their Cognito ID
3. If not, system presents a one-time setup screen:
   - "We found existing data under the name: [あやね, たかゆき, etc.]"
   - "Would you like to link this data to your account?"
4. User selects their previous display name
5. System migrates data:
   - Creates user mapping: Cognito ID → Display Name
   - Updates all COST_DATA items: Changes PK from `USER#あやね` to `USER#{cognitoId}`
   - Updates GSI1SK accordingly

### Step 4: Automatic LINE User Linking

For LINE Bot users:

1. When a LINE user interacts with the bot:
   - System checks for existing user mapping by LINE user ID
   - If found → uses mapped Cognito ID (if linked)
   - If not found → creates new mapping with LINE ID as canonical ID

2. When a Cognito user wants to link their LINE account:
   - Dashboard provides "Link LINE Account" option
   - Generates a one-time linking code
   - User sends code to LINE Bot
   - Bot links LINE user ID to Cognito user ID in user mapping
   - Future LINE Bot interactions will use the Cognito ID

## Backward Compatibility

The system maintains backward compatibility:

1. **Existing Data**: Continues to work without immediate migration
2. **Old User IDs**: Still queryable via user mapping repository
3. **Gradual Migration**: Users can be migrated as they log in
4. **No Breaking Changes**: Dashboard and bot continue to function

## Testing the Migration

### Test Case 1: New Cognito User
1. Create new Cognito account
2. Log in to dashboard
3. Create cost entry
4. Verify entry is stored with Cognito ID as user ID

### Test Case 2: Existing Display Name User
1. Have existing data under display name "あやね"
2. Log in with Cognito
3. Go through linking process
4. Verify data is migrated to Cognito ID
5. Create new entry
6. Verify both old and new data appear together

### Test Case 3: LINE Bot User
1. Interact with LINE Bot (not logged in to dashboard)
2. Create cost entry
3. Verify entry is stored with LINE ID as user ID
4. Verify user mapping is created

### Test Case 4: Linked User (Cognito + LINE)
1. Have Cognito account with data
2. Link LINE account via bot
3. Create entries via both methods
4. Verify all entries use the same canonical ID (Cognito)

## Rollback Plan

If migration needs to be rolled back:

1. Keep old data intact (don't delete)
2. Revert code changes to use old ID assignment
3. Optionally clean up user mapping table
4. No data loss as original PK/SK structure preserved

## Performance Considerations

1. **User Mapping Lookups**: Cache frequently accessed mappings
2. **Dashboard Queries**: Add display name resolution to avoid multiple lookups
3. **Migration Script**: Run during low-traffic hours
4. **Batch Operations**: Process migrations in batches to avoid timeouts

## Security Considerations

1. **User Linking**: Verify ownership before linking accounts
2. **One-Time Codes**: Use secure, time-limited codes for LINE linking
3. **Access Control**: Ensure users can only access their own data
4. **Audit Log**: Track all user linking and data migration events

## Support

For questions or issues during migration:
- Check CloudWatch logs for error messages
- Review user mapping table for consistency
- Use DynamoDB console to inspect data structure
- Test with a small subset of users before full migration
