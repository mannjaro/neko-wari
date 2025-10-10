# Passkey Auto-Suggestion Implementation

## Overview
This document explains the implementation of automatic passkey suggestion when a user attempts to log in with a passkey that's already registered in their device's Keychain.

## Problem Statement
When a user clicked "Passkeyでログイン" (Login with Passkey) button, the browser didn't automatically suggest available passkeys that were already registered on the device. This forced users to manually navigate through authentication prompts instead of seeing their passkeys immediately.

## Root Cause
The WebAuthn specification defines two modes for passkey authentication:

1. **Resident Key Mode (Discoverable Credentials)**: When `allowCredentials` is `undefined` or omitted, the browser will automatically discover and display all passkeys registered for the Relying Party (RP) domain.

2. **Non-Resident Key Mode**: When `allowCredentials` is an array (even if empty `[]`), the browser expects specific credential IDs and won't perform automatic discovery.

The issue was that when Cognito sent an empty array `allowCredentials: []`, the browser interpreted this as "no credentials are allowed" rather than "discover all available credentials."

## Solution
Modified the `normalizeRequestOptions` function in `frontend/src/hooks/useAuthChallenge.ts` to:
- Check if `allowCredentials` exists and has length > 0
- If it's empty or undefined, set it to `undefined` (not empty array)
- This enables discoverable credential mode in the browser

### Code Change
```typescript
// Before:
const allowCredentials = publicKey.allowCredentials?.map((credential) => ({
  ...credential,
  id: ensureBase64URL(credential.id),
}));

// After:
const allowCredentials =
  publicKey.allowCredentials && publicKey.allowCredentials.length > 0
    ? publicKey.allowCredentials.map((credential) => ({
        ...credential,
        id: ensureBase64URL(credential.id),
      }))
    : undefined;
```

## Technical Details

### WebAuthn Credential Discovery
- When `allowCredentials` is undefined: Browser shows all passkeys for the RP
- When `allowCredentials` is empty array `[]`: Browser shows no passkeys (fails)
- When `allowCredentials` has credential IDs: Browser shows only those specific passkeys

### Browser Behavior
Modern browsers (Chrome, Safari, Edge, Firefox) support passkey autofill when:
1. The `allowCredentials` is undefined or omitted
2. The user has passkeys registered for the domain
3. The platform authenticator (Touch ID, Face ID, Windows Hello, etc.) is available

### AWS Cognito Integration
AWS Cognito's passkey authentication flow:
1. Client initiates authentication with `startUserAuth` specifying `WEB_AUTHN` challenge
2. Cognito returns challenge with WebAuthn options including `allowCredentials`
3. If user has no registered credentials or Cognito doesn't know them, it may return empty array
4. Our normalization converts empty array to undefined for proper browser behavior

## Testing
To test this change:

1. Register a passkey for a user account
2. Log out
3. Click "Passkeyでログイン" button
4. The browser should immediately show a passkey prompt with available credentials
5. Select the passkey to authenticate

### Expected Behavior
- **Before fix**: Browser shows generic "Use your passkey" dialog without suggestions
- **After fix**: Browser shows specific passkeys registered for the user/device

## References
- [WebAuthn Specification - PublicKeyCredentialRequestOptions](https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialrequestoptions)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [AWS Cognito Passkey Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-passkeys.html)
