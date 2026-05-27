import type { ReactNode } from "react";
import { AppAuthContext } from "./AppAuthContext";
import type { AppAuthState, AppUser } from "./types";

/**
 * Dummy user used during local development.
 * Customize via VITE_LOCAL_AUTH_NAME / VITE_LOCAL_AUTH_EMAIL env vars if needed.
 */
const LOCAL_USER: AppUser = {
  profile: {
    sub: "local-dummy-user",
    name: import.meta.env.VITE_LOCAL_AUTH_NAME ?? "ローカルユーザー",
    email: import.meta.env.VITE_LOCAL_AUTH_EMAIL ?? "local@example.com",
    username: "local_local-dummy-user",
  },
  access_token: "local-dummy-access-token",
  // Set far-future expiry so token-expiry checks always pass
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
};

const localAuthState: AppAuthState = {
  isAuthenticated: true,
  isLoading: false,
  error: undefined,
  user: LOCAL_USER,
  async signIn() {
    // No-op in local mode: already authenticated
  },
  async signOut() {
    // No-op in local mode
    console.info("[LocalAuth] signOut called (no-op in local mode)");
  },
  async signinSilent() {
    return LOCAL_USER;
  },
  clearStaleState() {
    // No-op in local mode
  },
  async removeUser() {
    // No-op in local mode
    console.info("[LocalAuth] removeUser called (no-op in local mode)");
  },
};

/**
 * Auth provider for local development.
 * Always provides an authenticated dummy user without any network calls.
 */
export function LocalAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AppAuthContext.Provider value={localAuthState}>
      {children}
    </AppAuthContext.Provider>
  );
}
