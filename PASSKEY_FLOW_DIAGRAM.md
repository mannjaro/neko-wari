# Passkey Authentication Flow

## Before Fix

```
User clicks "Passkeyでログイン"
              ↓
    authenticateWithPasskey()
              ↓
    Server: startPasskeyAuth()
              ↓
    Cognito: Returns WEB_AUTHN challenge
              ↓
    Challenge includes: allowCredentials: []
              ↓
    normalizeRequestOptions()
              ↓
    Returns: allowCredentials: []  ← Empty array
              ↓
    startAuthentication({ allowCredentials: [] })
              ↓
    Browser: "No credentials allowed" ❌
              ↓
    User sees: Generic dialog or authentication fails
```

## After Fix (with Auto-Trigger)

```
User enters email address
              ↓
    Auto-trigger activates (300ms delay)
              ↓
    authenticateWithPasskey()
              ↓
    Server: startPasskeyAuth()
              ↓
    Cognito: Returns WEB_AUTHN challenge
              ↓
    Challenge includes: allowCredentials: []
              ↓
    normalizeRequestOptions()
              ↓
    Checks: allowCredentials.length > 0? No
              ↓
    Returns: allowCredentials: undefined  ← Key fix!
              ↓
    startAuthentication({ allowCredentials: undefined })
              ↓
    Browser: "Discover all credentials" ✅
              ↓
    Browser shows: List of available passkeys
              ↓
    User selects: Their Touch ID/Face ID/Windows Hello credential
              ↓
    Authentication succeeds! 🎉
```

**Note:** Users can still manually click "Passkeyでログイン" button if they skip the auto-trigger.

## Technical Flow Details

### 1. Login Button Click
```typescript
// frontend/src/routes/login.tsx
<Button onClick={() => {
  if (emailValue) {
    authenticateWithPasskey({ username: emailValue });
  }
}}>
  Passkeyでログイン
</Button>
```

### 2. Initiate Passkey Authentication
```typescript
// frontend/src/hooks/useAuth.ts
const authenticateWithPasskey = useCallback((payload: PasskeyAuthRequest) => {
  mutation.mutate({ type: "PASSKEY", payload });
}, [mutation]);
```

### 3. Server-Side Challenge
```typescript
// frontend/src/server/auth.ts
export const startPasskeyAuth = createServerFn({
  method: "POST",
}).handler(async ({ data }) => {
  return service.startUserAuth(data.username, ChallengeNameType.WEB_AUTHN);
});
```

### 4. Normalize WebAuthn Options (THE FIX)
```typescript
// frontend/src/hooks/useAuthChallenge.ts
function normalizeRequestOptions(options: unknown) {
  // ... validation code ...
  
  // ✨ THE KEY FIX ✨
  const allowCredentials =
    publicKey.allowCredentials && publicKey.allowCredentials.length > 0
      ? publicKey.allowCredentials.map((credential) => ({
          ...credential,
          id: ensureBase64URL(credential.id),
        }))
      : undefined;  // Convert [] to undefined!
  
  return { ...publicKey, challenge, allowCredentials };
}
```

### 5. Browser WebAuthn API Call
```typescript
// Called automatically by useAuthChallenge hook
const assertion = await startAuthentication({
  optionsJSON: webAuthnOptions  // Now has allowCredentials: undefined
});
```

## Browser Behavior Comparison

### With `allowCredentials: []` (Before)
- Browser: "Array provided but empty"
- Behavior: No credentials to check
- Result: Authentication fails or shows generic error ❌

### With `allowCredentials: undefined` (After)
- Browser: "No array provided, discover credentials"
- Behavior: Platform authenticator searches for all credentials
- Result: Shows all passkeys registered for the RP ✅

### With `allowCredentials: [id1, id2, ...]` (Existing)
- Browser: "Specific credentials requested"
- Behavior: Shows only those specific credentials
- Result: Filtered credential list ✅

## Platform-Specific Prompts

### macOS/iOS (Safari/Chrome)
```
┌─────────────────────────────────────┐
│   🔐 Touch ID を使用してログイン       │
│                                      │
│   user@example.com                   │
│   Payment Dashboard                  │
│                                      │
│   [Touch ID センサーに指を置いてください]│
│                                      │
│   [ キャンセル ]                      │
└─────────────────────────────────────┘
```

### Windows (Edge/Chrome)
```
┌─────────────────────────────────────┐
│   🔐 Windows Hello                   │
│                                      │
│   Payment Dashboard にサインイン       │
│                                      │
│   user@example.com                   │
│                                      │
│   [顔をカメラに向けてください]           │
│   または [PIN を入力]                  │
│                                      │
│   [ キャンセル ]                      │
└─────────────────────────────────────┘
```

### Android (Chrome)
```
┌─────────────────────────────────────┐
│   🔐 パスキーでログイン                │
│                                      │
│   user@example.com                   │
│   Payment Dashboard                  │
│                                      │
│   [指紋センサーをタッチ]                │
│                                      │
│   [ キャンセル ]                      │
└─────────────────────────────────────┘
```
