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

1. Register a passkey for a user account:
   - Log in with email/password
   - Click "Passkeyを登録" button in the login success section
   - Complete the passkey registration flow

2. Log out from the application

3. Return to login page and enter your email address

4. Click "Passkeyでログイン" button

5. The browser should immediately show a passkey prompt with available credentials

6. Select the passkey to authenticate (Touch ID, Face ID, Windows Hello, etc.)

### Expected Behavior
- **Before fix**: Browser shows generic "Use your passkey" dialog without specific credential suggestions, or authentication may fail if `allowCredentials: []` is interpreted as "no credentials allowed"
- **After fix**: Browser automatically discovers and displays all passkeys registered for the domain, allowing the user to select their credential immediately

### Platform-Specific Behavior
- **macOS/iOS Safari**: Shows Touch ID/Face ID prompt with credential selection
- **Chrome/Edge**: Shows passkey selection dialog with available credentials
- **Android**: Shows biometric prompt with credential options
- **Windows**: Shows Windows Hello prompt with available passkeys

## Edge Cases and Considerations

### Empty vs Undefined `allowCredentials`
- `allowCredentials: undefined` → Browser discovers all available passkeys ✅
- `allowCredentials: []` → Browser interprets as "no credentials allowed" ❌
- `allowCredentials: [credential1, credential2]` → Browser shows only those specific credentials ✅

### Backward Compatibility
This change maintains backward compatibility:
- If Cognito sends specific credential IDs, they are properly normalized and used
- If Cognito sends empty array or omits the field, we convert to undefined for discovery
- Existing passkey authentication flows continue to work unchanged

### User Experience Impact
- Users with registered passkeys will see immediate credential suggestions
- New users without passkeys will see the standard registration flow
- The change is transparent and doesn't require any user action

## Auto-Trigger Feature

As of the latest update, passkey authentication is automatically triggered when a user enters their email address:

### Implementation
1. **Email Input Enhancement**: Added `autoComplete="username webauthn"` attribute to signal passkey support
2. **Auto-Trigger Logic**: When email is entered, passkey authentication starts automatically after 300ms
3. **One-Time Trigger**: Prevents multiple authentication attempts in a single session

### Code Implementation
```typescript
// Auto-trigger passkey authentication when email is entered
useEffect(() => {
  if (
    emailValue &&
    !isPending &&
    !isSuccess &&
    !hasAutoTriggered &&
    !challenge
  ) {
    setHasAutoTriggered(true);
    const timer = setTimeout(() => {
      authenticateWithPasskey({ username: emailValue });
    }, 300);
    return () => clearTimeout(timer);
  }
}, [emailValue, isPending, isSuccess, hasAutoTriggered, challenge, authenticateWithPasskey]);
```

### User Experience
- User enters email → Passkey prompt appears automatically
- No need to click "Passkeyでログイン" button
- Seamless authentication flow
- Falls back to manual button click if auto-trigger is skipped

## Future Enhancements
Consider implementing full conditional UI (autofill) for passkeys with WebAuthn Level 3:
```typescript
// Add mediation: "conditional" for autofill behavior
const assertion = await startAuthentication({
  optionsJSON: webAuthnOptions,
  useBrowserAutofill: true, // SimpleWebAuthn option for conditional UI
});
```

This would enable passkey suggestions directly in the email input field's autofill dropdown, similar to password managers, without requiring any authentication flow initiation.

## References
- [WebAuthn Specification - PublicKeyCredentialRequestOptions](https://www.w3.org/TR/webauthn-2/#dictdef-publickeycredentialrequestoptions)
- [WebAuthn Discoverable Credentials](https://www.w3.org/TR/webauthn-2/#client-side-discoverable-credential)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [AWS Cognito Passkey Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-passkeys.html)
- [Passkey Best Practices](https://web.dev/passkey-form-autofill/)
