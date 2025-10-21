// src/hooks/useAuthenticatedFetch.ts
import { useAuth } from "react-oidc-context";
import { useCallback } from "react";
import { isTokenExpired, hasRefreshToken } from "@/utils/authUtils";

/**
 * Custom hook that provides a fetch function with automatic token refresh
 * @returns An object containing the authenticated fetch function and auth state
 */
export function useAuthenticatedFetch() {
  const auth = useAuth();

  /**
   * Ensures a valid access token is available, refreshing if necessary
   * @returns Promise that resolves when a valid token is available
   * @throws Error if token refresh fails
   */
  const ensureValidToken = useCallback(async () => {
    // If user is not authenticated, throw error
    if (!auth.user) {
      throw new Error("User is not authenticated");
    }

    // Check if token is expired or about to expire
    if (isTokenExpired(auth.user)) {
      // Check if refresh token is available
      if (!hasRefreshToken(auth.user)) {
        throw new Error("No refresh token available. Please log in again.");
      }

      try {
        console.log("Access token expired. Refreshing token...");
        // Use signinSilent to refresh the token
        await auth.signinSilent();
        console.log("Token refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh token:", error);
        // If refresh fails, redirect to login
        throw new Error("Failed to refresh token. Please log in again.");
      }
    }
  }, [auth]);

  /**
   * Executes a fetch function with automatic token refresh
   * @param fetchFn - The fetch function to execute
   * @returns Promise that resolves with the fetch result
   */
  const authenticatedFetch = useCallback(
    async <T>(fetchFn: () => Promise<T>): Promise<T> => {
      try {
        // Ensure token is valid before making the request
        await ensureValidToken();

        // Execute the fetch function
        return await fetchFn();
      } catch (error) {
        // If the fetch fails with an authentication error, try to refresh and retry
        if (error instanceof Error && error.message.includes("401")) {
          console.log("Received 401 error. Attempting token refresh...");
          try {
            await ensureValidToken();
            // Retry the fetch after refreshing
            return await fetchFn();
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            throw refreshError;
          }
        }
        throw error;
      }
    },
    [ensureValidToken]
  );

  return {
    authenticatedFetch,
    ensureValidToken,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
  };
}
