# Authentication and Token Management

## Quick Reference

**Problem Solved**: アクセストークンの有効期限が切れた場合に、リフレッシュトークンが期限内であれば自動的にアクセストークンをリフレッシュする

**Solution Components**:
- ✅ `AuthGuard` component - Automatic token validation and refresh
- ✅ `isTokenExpired()` - Token expiration checking with 60-second buffer
- ✅ `hasRefreshToken()` - Refresh token validation
- ✅ Enhanced OIDC config - Silent renew with proper timeouts
- ✅ Periodic checks - Every 5 minutes
- ✅ Error handling - User-friendly messages and automatic logout on failure

**Key Files**:
- `frontend/src/components/AuthGuard.tsx` - Main token refresh logic
- `frontend/src/utils/authUtils.ts` - Token utility functions
- `frontend/src/routes/__root.tsx` - OIDC configuration
- `frontend/src/routes/dashboard.tsx` - Protected route with AuthGuard

## Overview

This application uses AWS Cognito for authentication with automatic access token refresh functionality. The frontend is built with React and uses `react-oidc-context` library for OIDC authentication flow.

## Authentication Flow

### Initial Login
1. User navigates to `/login` route
2. User clicks "サインイン" button
3. Redirected to Cognito Hosted UI
4. After successful authentication, redirected back to `/dashboard` with authorization code
5. `react-oidc-context` exchanges the code for tokens (access token, refresh token, ID token)

### Token Management

#### Access Token
- **Expiration**: Typically 1 hour (configured in Cognito)
- **Usage**: Used to authenticate API requests
- **Storage**: LocalStorage (via `oidc-client-ts`)

#### Refresh Token
- **Expiration**: Typically 30 days (configured in Cognito)
- **Usage**: Used to obtain new access tokens when they expire
- **Storage**: LocalStorage (via `oidc-client-ts`)

## Automatic Token Refresh

The application implements automatic token refresh at multiple levels:

### 1. OIDC Client Configuration (`__root.tsx`)

```typescript
{
  automaticSilentRenew: true,
  silentRequestTimeoutInSeconds: 30,
  accessTokenExpiringNotificationTimeInSeconds: 60,
}
```

- `automaticSilentRenew: true` - Enables automatic token refresh
- `silentRequestTimeoutInSeconds: 30` - Timeout for silent refresh requests
- `accessTokenExpiringNotificationTimeInSeconds: 60` - Trigger refresh 60 seconds before expiration

### 2. AuthGuard Component

The `AuthGuard` component provides an additional layer of token management:

**Location**: `frontend/src/components/AuthGuard.tsx`

**Features**:
- Checks token validity on mount
- Periodic token checks (every 5 minutes)
- Automatic refresh using `signinSilent()` when token is expired
- Loading state during refresh
- Error handling with user-friendly messages
- Automatic redirect to login if refresh fails

**Usage**:
```tsx
import { AuthGuard } from "@/components/AuthGuard";

function ProtectedPage() {
  return (
    <AuthGuard>
      {/* Your protected content */}
    </AuthGuard>
  );
}
```

### 3. Token Utility Functions

**Location**: `frontend/src/utils/authUtils.ts`

#### `isTokenExpired(user, bufferSeconds)`
Checks if the access token is expired or about to expire.

**Parameters**:
- `user`: OIDC user object
- `bufferSeconds`: Buffer time before expiration (default: 60 seconds)

**Returns**: `true` if token is expired or about to expire, `false` otherwise

**Example**:
```typescript
import { isTokenExpired } from "@/utils/authUtils";
import { useAuth } from "react-oidc-context";

const auth = useAuth();
if (isTokenExpired(auth.user)) {
  // Token needs refresh
}
```

#### `hasRefreshToken(user)`
Checks if a refresh token is available.

**Parameters**:
- `user`: OIDC user object

**Returns**: `true` if refresh token is available, `false` otherwise

### 4. Authenticated Fetch Hook (Optional)

**Location**: `frontend/src/hooks/useAuthenticatedFetch.ts`

For API calls that require authentication headers, use this hook to ensure valid tokens:

```typescript
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

function MyComponent() {
  const { authenticatedFetch, ensureValidToken } = useAuthenticatedFetch();

  const fetchData = async () => {
    return authenticatedFetch(async () => {
      const response = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${auth.user?.access_token}`
        }
      });
      return response.json();
    });
  };
}
```

## Token Refresh Process

### Successful Refresh Flow
```
1. AuthGuard detects token expiration (< 60 seconds remaining)
   └─> isTokenExpired(user, 60) returns true
2. Checks if refresh token is available
   └─> hasRefreshToken(user) returns true
3. Calls auth.signinSilent() to refresh
   └─> Opens hidden iframe with prompt=none
4. OIDC client sends refresh token to Cognito
   └─> POST to /oauth2/token with refresh_token grant
5. Cognito validates and returns new access token
   └─> New token has fresh expiration time
6. Tokens updated in LocalStorage
   └─> User object updated with new tokens
7. Application continues normally
   └─> No interruption to user experience
```

### Failed Refresh Flow
```
1. AuthGuard detects token expiration
   └─> isTokenExpired(user, 60) returns true
2. Attempts to refresh with auth.signinSilent()
   └─> Sends refresh token to Cognito
3. Refresh fails (e.g., refresh token expired)
   └─> Cognito returns error response
4. Error message displayed to user
   └─> "トークンの更新に失敗しました。再度ログインしてください。"
5. After 2 seconds, user is logged out
   └─> auth.removeUser() clears tokens
6. Redirected to login page
   └─> useEffect in Dashboard triggers navigation
```

### Visual Flow Diagram
```
User Activity
     │
     ├─> Page Load / User Returns
     │       │
     │       ├─> AuthGuard mounted
     │       │       │
     │       │       ├─> Check: isTokenExpired(user, 60)?
     │       │       │       │
     │       │       │       ├─[No]──> Continue normally
     │       │       │       │
     │       │       │       └─[Yes]─> Check: hasRefreshToken(user)?
     │       │       │                       │
     │       │       │                       ├─[No]──> Show error → Logout
     │       │       │                       │
     │       │       │                       └─[Yes]─> auth.signinSilent()
     │       │       │                                       │
     │       │       │                                       ├─[Success]─> Update tokens
     │       │       │                                       │                  │
     │       │       │                                       │                  └─> Continue
     │       │       │                                       │
     │       │       │                                       └─[Fail]────> Show error → Logout
     │       │       │
     │       │       └─> Set interval (5 min) for periodic checks
     │       │
     │       └─> Render protected content
     │
     └─> Every 5 minutes: Repeat token check
```

## Error Handling

### Common Scenarios

#### 1. Refresh Token Expired
**Symptom**: User sees "セッションが期限切れです。再度ログインしてください。"
**Action**: User must log in again

#### 2. Network Error During Refresh
**Symptom**: Token refresh fails with network error
**Action**: AuthGuard retries on next periodic check (5 minutes)

#### 3. Invalid Tokens
**Symptom**: Tokens are corrupted or invalid
**Action**: 
- User can click "ストレージをクリアして再読み込み" on login page
- This clears LocalStorage and reloads the page

## Testing

### Unit Tests
Location: `test/authUtils.test.ts`

Run tests:
```bash
npm run test
# or
npx vitest run test/authUtils.test.ts
```

Tests cover:
- Token expiration detection with various scenarios
- Refresh token availability checks
- Edge cases (null users, missing properties)

### Manual Testing

#### Test Token Expiration
1. Log in to the application
2. Open browser DevTools → Application → Local Storage
3. Find the OIDC user key (starts with `oidc.user:`)
4. Modify `expires_at` to a past timestamp
5. Wait for AuthGuard to detect and refresh (should happen within 5 minutes)

#### Test Refresh Token Expiration
1. Log in to the application
2. Remove the refresh_token from LocalStorage
3. Modify `expires_at` to trigger refresh
4. AuthGuard should show error message

## Configuration

### Cognito Settings

The application uses the following Cognito configuration:

- **Authority**: `https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_ntfS5MRXx`
- **Client ID**: `52egt02nn47oubgatq6vadtgs4`
- **Scopes**: `aws.cognito.signin.user.admin email openid phone profile`

### Environment-Specific Settings

The redirect URI is environment-specific:
- **Development**: `http://localhost:3000`
- **Production**: `https://advanced-payment-dashboard.zk-****.workers.dev`

## Best Practices

1. **Always use AuthGuard** for protected routes
2. **Check token validity** before long-running operations
3. **Handle refresh failures** gracefully with user-friendly messages
4. **Don't store tokens** in state or props (use OIDC context)
5. **Monitor token expiration** in production logs

## Troubleshooting

### Issue: User keeps getting logged out
**Solution**: 
- Check if refresh token expiration is configured correctly in Cognito
- Verify `automaticSilentRenew` is enabled
- Check browser console for errors

### Issue: Token refresh takes too long
**Solution**:
- Increase `silentRequestTimeoutInSeconds` in OIDC config
- Check network latency to Cognito endpoints

### Issue: Silent refresh fails
**Solution**:
- Ensure Cognito allows silent refresh (check allowed OAuth flows)
- Verify redirect URI is registered in Cognito app client
- Check browser console for CORS errors

## References

- [react-oidc-context Documentation](https://github.com/authts/react-oidc-context)
- [oidc-client-ts Documentation](https://github.com/authts/oidc-client-ts)
- [AWS Cognito Token Management](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)
