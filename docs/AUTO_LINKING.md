# Automatic User Linking via Display Name

## Overview

The unified user ID system now includes **automatic linking** functionality that connects LINE Bot users with Cognito users based on matching display names. This ensures that users who interact via both the LINE Bot and the frontend dashboard are properly unified under a single canonical ID.

## How It Works

### Scenario 1: LINE User First, Then Cognito User

1. **User interacts with LINE Bot**
   - Selects display name "あやね" during bot interaction
   - System creates user mapping:
     ```typescript
     {
       cognitoUserId: "U1234567890abc...",  // LINE ID used as canonical
       lineUserId: "U1234567890abc...",
       displayName: "あやね",
       createdAt: "2025-11-10T10:00:00Z",
       updatedAt: "2025-11-10T10:00:00Z"
     }
     ```
   - Cost data stored under PK: `USER#U1234567890abc...`

2. **Same user logs into dashboard with Cognito**
   - Logs in, JWT contains `sub: "uuid-cognito-id"`
   - Provides display name "あやね" (or leaves it empty, defaulting to email)
   - System searches for unlinked LINE users with display name "あやね"
   - **Automatic linking occurs:**
     ```typescript
     {
       cognitoUserId: "uuid-cognito-id",     // Now using Cognito ID
       lineUserId: "U1234567890abc...",     // Linked to LINE account
       displayName: "あやね",
       email: "ayane@example.com",
       createdAt: "2025-11-10T10:00:00Z",
       updatedAt: "2025-11-10T11:00:00Z"
     }
     ```
   - Future cost data stored under PK: `USER#uuid-cognito-id`

### Scenario 2: Cognito User First, Then LINE User

1. **User logs into dashboard with Cognito**
   - JWT contains `sub: "uuid-cognito-id"`
   - Provides display name "たかゆき"
   - System creates user mapping:
     ```typescript
     {
       cognitoUserId: "uuid-cognito-id",
       displayName: "たかゆき",
       email: "takayuki@example.com",
       createdAt: "2025-11-10T10:00:00Z",
       updatedAt: "2025-11-10T10:00:00Z"
     }
     ```
   - Cost data stored under PK: `USER#uuid-cognito-id`

2. **Same user interacts with LINE Bot later**
   - Selects display name "たかゆき" during bot interaction
   - LINE user ID: "U9876543210xyz..."
   - System creates/updates mapping:
     ```typescript
     {
       cognitoUserId: "uuid-cognito-id",     // Keeps Cognito ID as canonical
       lineUserId: "U9876543210xyz...",     // Now linked to LINE account
       displayName: "たかゆき",
       email: "takayuki@example.com",
       createdAt: "2025-11-10T10:00:00Z",
       updatedAt: "2025-11-10T12:00:00Z"
     }
     ```
   - LINE Bot cost data also stored under PK: `USER#uuid-cognito-id`

## Technical Implementation

### Frontend (Cognito User Creation)

When a Cognito user creates their first cost entry:

```typescript
// lambda/backend/handlers/updateHandlers.ts
export const createCostHandler = async (c: Context, req: CreateCostData) => {
  const authenticatedUser = getAuthenticatedUser(c);
  const canonicalUserId = getCanonicalUserId(authenticatedUser); // Cognito sub
  
  let userMapping = await userMappingRepository.getUserMappingByCognitoId(canonicalUserId);
  
  if (!userMapping) {
    const displayName = req.displayName || getUserDisplayName(authenticatedUser);
    
    // Check for existing LINE user with same display name
    const unlinkedLineUsers = await userMappingRepository
      .findUnlinkedLineUsersByDisplayName(displayName);
    
    if (unlinkedLineUsers.length > 0) {
      // Automatic linking!
      const lineUser = unlinkedLineUsers[0];
      userMapping = {
        cognitoUserId: canonicalUserId,
        lineUserId: lineUser.lineUserId,
        displayName: displayName,
        email: authenticatedUser.email,
        // ...
      };
      
      // Merge LINE user data
      await userMappingRepository.mergeLINEUserIntoCognitoUser(
        lineUser.lineUserId!,
        canonicalUserId
      );
    }
  }
  // ...
};
```

### Webhook (LINE Bot User)

When a LINE user creates cost entries:

```typescript
// lambda/webhook/handlers/postbackEventHandler.ts
if (data === POSTBACK_DATA.CONFIRM_YES) {
  let userMapping = await userMappingRepository.getUserMappingByLineId(userId);
  
  if (!userMapping) {
    // Create mapping with LINE ID as canonical (temporary)
    userMapping = {
      cognitoUserId: userId,  // LINE ID used until Cognito links
      lineUserId: userId,
      displayName: currentState.user || "LINE User",
      // ...
    };
  }
  
  const canonicalUserId = userMapping.cognitoUserId;
  // Use canonical ID (will be Cognito ID if already linked)
  await costDataRepository.saveCostData(canonicalUserId, currentState);
}
```

## User Mapping Repository

### New Method: findUnlinkedLineUsersByDisplayName

```typescript
async findUnlinkedLineUsersByDisplayName(
  displayName: string
): Promise<UserMapping[]> {
  // Scans for LINE users where:
  // - EntityType = "USER_MAPPING"
  // - DisplayName matches
  // - LineUserId === CognitoUserId (not yet linked to Cognito)
  
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 
        "EntityType = :entityType AND DisplayName = :displayName AND LineUserId = CognitoUserId",
      ExpressionAttributeValues: {
        ":entityType": "USER_MAPPING",
        ":displayName": displayName,
      },
    })
  );
  
  return result.Items || [];
}
```

### New Method: mergeLINEUserIntoCognitoUser

```typescript
async mergeLINEUserIntoCognitoUser(
  lineUserId: string,
  cognitoUserId: string
): Promise<void> {
  const lineMapping = await this.getUserMappingByLineId(lineUserId);
  const cognitoMapping = await this.getUserMappingByCognitoId(cognitoUserId);
  
  // Update LINE user mapping to point to Cognito ID
  await this.saveUserMapping({
    cognitoUserId: cognitoUserId,  // Changed from LINE ID to Cognito ID
    lineUserId: lineUserId,
    displayName: lineMapping.displayName,
    email: cognitoMapping.email || lineMapping.email,
    // ...
  });
}
```

## Data Flow Examples

### Example 1: Complete Flow

**Step 1:** User interacts with LINE Bot
```
LINE User ID: U111222333
Display Name: あやね
Action: Create cost ¥100,000

User Mapping Created:
{
  PK: "USER_MAPPING#U111222333",
  SK: "PROFILE#MAIN",
  GSI1PK: "LINE_USER#U111222333",
  GSI1SK: "USER_MAPPING",
  CognitoUserId: "U111222333",  // Same as LINE ID
  LineUserId: "U111222333",
  DisplayName: "あやね"
}

Cost Data:
{
  PK: "USER#U111222333",
  SK: "COST#1699600000000",
  User: "あやね",
  Price: 100000
}
```

**Step 2:** User logs into dashboard
```
Cognito User: uuid-aaaa-bbbb-cccc-dddd
Display Name: あやね (provided or from email)
Action: Create cost ¥50,000

System checks for unlinked LINE users with "あやね"
Finds: U111222333

User Mapping Updated:
{
  PK: "USER_MAPPING#uuid-aaaa-bbbb-cccc-dddd",  // Changed!
  SK: "PROFILE#MAIN",
  GSI1PK: "LINE_USER#U111222333",
  GSI1SK: "USER_MAPPING",
  CognitoUserId: "uuid-aaaa-bbbb-cccc-dddd",  // Now Cognito
  LineUserId: "U111222333",                   // Linked
  DisplayName: "あやね",
  Email: "ayane@example.com"
}

Cost Data:
{
  PK: "USER#uuid-aaaa-bbbb-cccc-dddd",  // New costs use Cognito ID
  SK: "COST#1699610000000",
  User: "あやね",
  Price: 50000
}

Note: Old cost data still at PK: "USER#U111222333"
      (Data migration needed for full unification)
```

**Step 3:** User uses LINE Bot again
```
LINE User ID: U111222333
Display Name: あやね
Action: Create cost ¥30,000

System finds mapping by LINE ID
Gets: CognitoUserId = "uuid-aaaa-bbbb-cccc-dddd"

Cost Data:
{
  PK: "USER#uuid-aaaa-bbbb-cccc-dddd",  // Now unified!
  SK: "COST#1699620000000",
  User: "あやね",
  Price: 30000
}
```

## Benefits

1. **Seamless Integration**: Users don't need to manually link accounts
2. **Automatic Detection**: System recognizes same user via display name
3. **Progressive Enhancement**: Works with existing LINE-only users
4. **Future-Proof**: Cognito ID becomes canonical, maintaining consistency

## Limitations

1. **Display Name Collisions**: If multiple LINE users have same display name, only first match is linked
2. **Manual Resolution**: No UI for manual linking (if automatic linking doesn't work)
3. **Data Migration**: Historical data remains under old PK (requires separate migration)
4. **Scan Operation**: Finding unlinked users by display name requires DynamoDB scan (consider GSI in production)

## Future Enhancements

1. **Manual Linking UI**: Allow users to manually link LINE accounts from dashboard
2. **Data Migration Tool**: Automatically migrate historical cost data to unified ID
3. **Display Name GSI**: Add GSI to avoid scan operations
4. **Conflict Resolution**: Handle multiple LINE users with same display name
5. **Unlinking**: Allow users to unlink LINE accounts if needed

## Security Considerations

1. **Display Name Trust**: System trusts display names for linking - consider adding verification
2. **Email Verification**: Cognito email should be verified before linking
3. **Audit Logging**: Track all automatic linking events for security review
4. **User Notification**: Consider notifying users when accounts are automatically linked

## Monitoring

Key metrics to track:

1. **Automatic Links Created**: Count successful display name matches
2. **Unlinked LINE Users**: Monitor LINE users not yet linked to Cognito
3. **Linking Failures**: Track cases where linking couldn't occur
4. **Data Consistency**: Verify cost data is stored under correct canonical ID

## Testing

Test scenarios:

1. ✅ LINE user first → Cognito user with same display name → Verify linking
2. ✅ Cognito user first → LINE user with same display name → Verify no duplicate
3. ✅ Multiple LINE users with same display name → Verify first match behavior
4. ✅ Different display names → Verify no incorrect linking
5. ✅ Cost data created before/after linking → Verify correct PK usage
