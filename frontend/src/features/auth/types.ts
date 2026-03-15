/**
 * Abstracted user type that is independent of any specific auth provider.
 * Both Cognito and local dev implementations map to this type.
 */
export interface AppUser {
  profile: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    /** Provider-specific username (e.g. Cognito username) */
    username?: string;
    [key: string]: unknown;
  };
  access_token: string;
  expires_at?: number;
  refresh_token?: string;
}

/**
 * Unified auth state interface.
 * Implementations: CognitoAuthProvider (production), LocalAuthProvider (local dev).
 */
export interface AppAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: Error;
  user: AppUser | null;
  /** Redirect to the identity provider login page */
  signIn(): Promise<void>;
  /** Sign out and clear session */
  signOut(): Promise<void>;
  /** Perform a silent token refresh */
  signinSilent(): Promise<AppUser | null>;
  /** Clear stale OIDC state (e.g. after an error) */
  clearStaleState(): void;
  /** Remove local user session */
  removeUser(): Promise<void>;
}
