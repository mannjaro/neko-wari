import type { ReactNode } from "react";
import { LocalAuthProvider } from "./LocalAuthProvider";
import { CognitoAuthProvider } from "./CognitoAuthProvider";

/**
 * Set VITE_LOCAL_AUTH=true in .env.local to use the dummy local user.
 * Omit the variable (or set it to false) for production Cognito auth.
 */
const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

/**
 * Top-level auth provider.
 * Selects the correct implementation based on the VITE_LOCAL_AUTH env variable.
 *
 * Usage in the app root:
 *   <AppAuthProvider>
 *     <App />
 *   </AppAuthProvider>
 */
export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (isLocalAuth) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
  return <CognitoAuthProvider>{children}</CognitoAuthProvider>;
}
