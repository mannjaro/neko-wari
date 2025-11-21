import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "react-oidc-context";
import { createRouter } from "./router";
import { cognitoAuthConfig } from "./utils/auth";
import { useEffect, useState } from "react";
import { isTokenExpired, hasRefreshToken } from "./utils/authUtils";

const router = createRouter();

function AuthRefresher({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Skip if already refreshing or not authenticated
      if (isRefreshing || !auth.isAuthenticated || !auth.user) {
        return;
      }

      // Check if token is expired or about to expire (60 seconds buffer)
      if (isTokenExpired(auth.user, 60)) {
        // Check if refresh token is available
        if (!hasRefreshToken(auth.user)) {
          console.error("No refresh token available");
          return;
        }

        try {
          setIsRefreshing(true);
          console.log("Access token expired. Attempting silent refresh...");
          await auth.signinSilent();
          console.log("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token:", error);
          // Remove user and redirect to login after a delay
          setTimeout(() => {
            auth.removeUser();
          }, 2000);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    // Check token on mount and when auth state changes
    checkAndRefreshToken();

    // Set up interval to check token periodically (every 5 minutes)
    const intervalId = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [auth, isRefreshing]);

  return <>{children}</>;
}

function InnerApp() {
  const auth = useAuth();

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          isAuthenticated: auth.isAuthenticated,
          user: auth.user,
          isLoading: auth.isLoading,
          signinRedirect: auth.signinRedirect,
        },
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        // Redirect logic is handled by the router now, but we might need to clear
        // the URL parameters if OIDC library doesn't do it automatically.
        // For now, we can leave it empty or do a simple history replace.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }}
    >
      <AuthRefresher>
        <InnerApp />
      </AuthRefresher>
    </AuthProvider>
  );
}
