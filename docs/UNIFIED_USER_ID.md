# Unified User ID System

## Overview

This document describes the unified user ID system implemented to ensure consistent user identification across both frontend (dashboard) and webhook (LINE Bot) registration methods.

## Problem Statement

Previously, the application assigned different user IDs depending on the registration method:

- **Frontend (Dashboard)**: Used manually entered user names (e.g., "****", "****") as user IDs
- **Webhook (LINE Bot)**: Used LINE user IDs (e.g., "U1234567890abc...") as user IDs

This caused the same physical user to have different identities in the system, preventing data consolidation and creating confusion.

## Solution Architecture

The solution introduces a **canonical user ID** system with a **user mapping layer** to resolve different external identifiers to a single internal user ID.

### Key Components

1. **Canonical User ID**: The primary identifier for a user in the system
   - For Cognito authenticated users: Uses Cognito `sub` (UUID format)
   - For LINE-only users: Uses LINE user ID until linked with Cognito

2. **User Mapping Table**: Maps external identifiers to canonical user IDs
   - Maps Cognito user ID → Display Name
   - Maps LINE user ID → Canonical User ID
   - Allows linking LINE accounts to Cognito accounts

3. **JWT Authentication**: Extracts user identity from Cognito access tokens
   - Verifies JWT signature using Cognito JWKS
   - Extracts `sub`, `email`, and other user attributes
   - Applied to all frontend API requests

## Database Schema

### USER_MAPPING Entity

```typescript
{
  PK: "USER_MAPPING#{cognitoUserId}",      // Primary key: Canonical user ID
  SK: "PROFILE#MAIN",                       // Sort key: Fixed value
  GSI1PK: "LINE_USER#{lineUserId}",        // GSI: LINE user ID (optional)
  GSI1SK: "USER_MAPPING",                   // GSI: Fixed value (optional)
  EntityType: "USER_MAPPING",
  CognitoUserId: string,                    // Canonical user ID
  LineUserId?: string,                      // LINE user ID (if linked)
  DisplayName: string,                      // User's display name
  Email?: string,                           // Email from Cognito
  CreatedAt: string,                        // ISO timestamp
  UpdatedAt: string,                        // ISO timestamp
}
```

**Access Patterns:**
- Query by Cognito ID: Direct get on PK/SK
- Query by LINE ID: GSI query on GSI1PK/GSI1SK
- List all mappings: Scan (admin only)

### COST_DATA Entity (Updated)

The COST_DATA entity structure remains the same, but field usage changed:

```typescript
{
  PK: "USER#{canonicalUserId}",            // Now uses canonical ID
  SK: "COST#{timestamp}",
  // ... other fields ...
  User: string,                             // Display name (from mapping)
  // ... other fields ...
}
```

**Key Change**: `PK` now contains the canonical user ID instead of the display name or LINE user ID.

## Authentication Flow

### Frontend (Dashboard) Authentication

```
1. User logs in via Cognito hosted UI
   └─> Redirected back with authorization code
   
2. react-oidc-context exchanges code for tokens
   └─> Receives: access_token, id_token, refresh_token
   
3. Frontend makes API request with access token
   └─> Authorization: Bearer {access_token}
   
4. Backend authMiddleware verifies JWT
   ├─> Validates signature using Cognito JWKS
   ├─> Validates issuer and expiration
   └─> Extracts user: { sub, email, ... }
   
5. Backend handler gets authenticated user
   └─> Uses sub as canonical user ID
   
6. Create/update user mapping
   ├─> Checks if mapping exists for sub
   ├─> Creates if missing with display name
   └─> Stores email from Cognito
   
7. Perform operation with canonical ID
   └─> All data stored under canonical user ID
```

### Webhook (LINE Bot) Authentication

```
1. LINE user sends message to bot
   └─> Webhook receives event with source.userId
   
2. Bot handler extracts LINE user ID
   └─> userId = event.source.userId
   
3. Query user mapping by LINE user ID
   └─> Uses GSI to find mapping
   
4. Mapping found?
   ├─[Yes]─> Use mapped canonical user ID
   │         └─> cognitoUserId from mapping
   │
   └─[No]──> Create new mapping
             ├─> cognitoUserId = lineUserId (temporary)
             ├─> lineUserId = lineUserId
             ├─> displayName = user selection (e.g., "****")
             └─> Future: Can be linked to Cognito
   
5. Perform operation with canonical ID
   └─> All data stored under canonical user ID
```

## User ID Resolution Logic

The `userMappingRepository.getCanonicalUserId()` method resolves any user ID to its canonical form:

```typescript
async getCanonicalUserId(userId: string): Promise<string> {
  // 1. Check if already a Cognito user ID (UUID format)
  if (isUUID(userId)) {
    return userId;  // Already canonical
  }
  
  // 2. Try to find mapping by LINE user ID
  const mapping = await getUserMappingByLineId(userId);
  if (mapping) {
    return mapping.cognitoUserId;  // Mapped canonical ID
  }
  
  // 3. Not found - return as-is (backward compatibility)
  return userId;
}
```

## API Endpoints

All backend API endpoints now require authentication except health check and webhook:

### Protected Endpoints

- `POST /cost/create` - Create new cost entry
- `PUT /user/:uid/detail/:timestamp` - Update cost entry
- `DELETE /user/:uid/detail/:timestamp` - Delete cost entry
- `GET /dashboard/monthly` - Get monthly dashboard
- `GET /dashboard/user/details` - Get user details
- `GET /dashboard/category/summary` - Get category summary

### Public Endpoints

- `GET /` - Health check
- `POST /webhook` - LINE Bot webhook (authenticated by LINE signature)

## Frontend Changes

### 1. AddDetailDialog Component

**Before:**
```tsx
<FormField name="userId">
  <Input placeholder="ユーザー名を入力" />
  <FormDescription>支払いをしたユーザーを入力してください</FormDescription>
</FormField>
```

**After:**
```tsx
<FormField name="displayName">
  <Input placeholder="表示名を入力（省略可）" />
  <FormDescription>
    支払い情報に表示する名前（省略した場合はメールアドレスが使用されます）
  </FormDescription>
</FormField>
```

### 2. Server Functions

All server functions now pass the access token:

```typescript
// Before
await createCost({ data });

// After
const accessToken = auth.user?.access_token;
await createCost({ data, accessToken });
```

### 3. Hooks

All hooks now extract and pass the access token:

```typescript
export function useCreateCost() {
  const auth = useAuth();
  
  return useCallback(async (data: CreateCostData) => {
    const accessToken = auth.user?.access_token;
    if (!accessToken) {
      throw new Error("User is not authenticated");
    }
    
    const result = await createCost({ data, accessToken });
    // ...
  }, [auth.user?.access_token]);
}
```

## Backend Changes

### 1. Auth Middleware

New middleware verifies JWT tokens and extracts user identity:

```typescript
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader.substring(7); // Remove "Bearer "
  
  // Verify JWT with Cognito JWKS
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: COGNITO_ISSUER,
  });
  
  // Store user in context
  c.set("user", {
    sub: payload.sub,
    email: payload.email,
    // ...
  });
  
  return next();
}
```

### 2. Create Cost Handler

Handler now extracts user ID from authenticated context:

```typescript
export const createCostHandler = async (c: Context, req: CreateCostData) => {
  // Get authenticated user
  const authenticatedUser = getAuthenticatedUser(c);
  const canonicalUserId = getCanonicalUserId(authenticatedUser);
  
  // Get or create user mapping
  let userMapping = await userMappingRepository.getUserMappingByCognitoId(canonicalUserId);
  if (!userMapping) {
    const displayName = req.displayName || getUserDisplayName(authenticatedUser);
    userMapping = {
      cognitoUserId: canonicalUserId,
      displayName,
      email: authenticatedUser.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userMappingRepository.saveUserMapping(userMapping);
  }
  
  // Create cost with canonical ID
  const costData = { ...req, userId: canonicalUserId };
  return await costService.createCostDetail(costData);
};
```

### 3. Webhook Handler

Webhook handler creates user mappings for LINE users:

```typescript
// Get or create user mapping for LINE user
let userMapping = await userMappingRepository.getUserMappingByLineId(userId);

if (!userMapping) {
  // Create new mapping using LINE ID as canonical until Cognito link
  userMapping = {
    cognitoUserId: userId,  // Temporary: use LINE ID
    lineUserId: userId,
    displayName: currentState.user || "LINE User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await userMappingRepository.saveUserMapping(userMapping);
}

const canonicalUserId = userMapping.cognitoUserId;

// Save cost data with canonical ID
await costDataRepository.saveCostData(canonicalUserId, currentState);
```

## User Linking (Future Enhancement)

To link a LINE account to a Cognito account:

1. **User initiates linking from dashboard**
   - Generates a one-time linking code
   - Displays code to user

2. **User sends code to LINE Bot**
   - Bot verifies code
   - Bot updates user mapping:
     - Changes `cognitoUserId` from LINE ID to Cognito ID
     - Keeps `lineUserId` for reverse lookup

3. **Data migration**
   - Move all COST_DATA from old PK to new PK
   - Update user mapping

4. **Future interactions**
   - LINE Bot uses Cognito ID from mapping
   - Dashboard uses Cognito ID from JWT
   - Both methods create data under same canonical ID

## Migration Strategy

For existing data, see [MIGRATION.md](./MIGRATION.md) for detailed migration steps.

**Summary:**
- New users: Automatically use canonical IDs
- Existing Cognito users: Migrated on next login
- Existing LINE users: Migrated on next bot interaction
- Manual linking: Available via dashboard (future)

## Benefits

1. **Consistent Identity**: Same user always has same ID
2. **Data Consolidation**: All user data under one ID
3. **Multi-Channel Support**: Works across web and LINE Bot
4. **Security**: JWT-based authentication with verification
5. **Scalability**: Easy to add more external identity providers
6. **Backward Compatible**: Existing data continues to work

## Testing

### Unit Tests
- JWT verification
- User mapping CRUD operations
- Canonical ID resolution

### Integration Tests
- Frontend authentication flow
- Webhook user mapping creation
- Cross-channel data access

### Manual Testing Checklist
- [ ] Create cost via dashboard (new user)
- [ ] Create cost via LINE Bot (new user)
- [ ] Create cost via both methods (verify same ID)
- [ ] Update/delete cost via dashboard
- [ ] Update/delete cost via LINE Bot
- [ ] View dashboard with mixed data sources
- [ ] Token expiration and refresh
- [ ] Invalid token handling

## Security Considerations

1. **Token Verification**: All JWTs verified against Cognito JWKS
2. **Token Expiration**: Tokens have 1-hour lifetime
3. **Refresh Tokens**: Automatically refreshed by frontend
4. **HTTPS Only**: All API communication over HTTPS
5. **No Token Storage**: Tokens not stored in backend
6. **User Isolation**: Users can only access their own data

## Performance

1. **User Mapping Cache**: Consider caching frequently accessed mappings
2. **JWT Verification**: Uses cached JWKS, minimal overhead
3. **Database Queries**: Single query for user data (by canonical ID)
4. **No Additional Roundtrips**: User ID resolved once per request

## Monitoring

Key metrics to monitor:

1. **Authentication Failures**: Track JWT verification failures
2. **User Mapping Misses**: Track users without mappings
3. **LINE User Creation**: Track new LINE user mappings
4. **API Request Success Rate**: Monitor 401 errors
5. **Token Refresh Rate**: Monitor token expiration patterns

## Support

For questions or issues:
- Review CloudWatch logs for authentication errors
- Check user mapping table for data consistency
- Verify Cognito configuration matches code
- Test with curl/Postman for API debugging
