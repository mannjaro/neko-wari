import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { cognitoAuthConfig } from "@/utils/auth";
import { AppAuthContext } from "./AppAuthContext";
import type { AppAuthState, AppUser } from "./types";

/**
 * Inner bridge component that adapts react-oidc-context's auth state to AppAuthState.
 * Must be rendered inside <AuthProvider> so that useAuth() is available.
 */
function CognitoAuthBridge({ children }: { children: ReactNode }) {
  const auth = useAuth();

  function toAppUser(): AppUser | null {
    if (!auth.user) return null;
    return {
      profile: {
        ...auth.user.profile,
        sub: auth.user.profile.sub,
        name: auth.user.profile.name,
        email: auth.user.profile.email,
        picture: auth.user.profile.picture,
      },
      access_token: auth.user.access_token,
      expires_at: auth.user.expires_at,
      refresh_token: auth.user.refresh_token ?? undefined,
    };
  }

  const state: AppAuthState = {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    user: toAppUser(),
    async signIn() {
      await auth.signinRedirect();
    },
    async signOut() {
      await auth.signoutRedirect();
    },
    async signinSilent() {
      const user = await auth.signinSilent();
      if (!user) return null;
      return {
        profile: {
          ...user.profile,
          sub: user.profile.sub,
          name: user.profile.name,
          email: user.profile.email,
          picture: user.profile.picture,
        },
        access_token: user.access_token,
        expires_at: user.expires_at,
        refresh_token: user.refresh_token ?? undefined,
      };
    },
    clearStaleState() {
      auth.clearStaleState();
    },
    async removeUser() {
      await auth.removeUser();
    },
  };

  return (
    <AppAuthContext.Provider value={state}>{children}</AppAuthContext.Provider>
  );
}

/**
 * Auth provider for production/staging that delegates to AWS Cognito via OIDC.
 */
export function CognitoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <CognitoAuthBridge>{children}</CognitoAuthBridge>
    </AuthProvider>
  );
}
