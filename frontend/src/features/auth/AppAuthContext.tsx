import { createContext, useContext } from "react";
import type { AppAuthState } from "./types";

export const AppAuthContext = createContext<AppAuthState | null>(null);

/**
 * Hook to access the unified auth state.
 * Must be used inside an AppAuthProvider (or one of its implementations).
 */
export function useAppAuth(): AppAuthState {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error("useAppAuth must be used within an AppAuthProvider");
  }
  return ctx;
}
