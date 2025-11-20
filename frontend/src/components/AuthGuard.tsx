// src/components/AuthGuard.tsx
import { useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import { isTokenExpired, hasRefreshToken } from "@/utils/authUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that ensures the user has a valid access token
 * Automatically refreshes the token if it's expired but the refresh token is still valid
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const auth = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      // Skip if already refreshing or not authenticated
      if (isRefreshing || !auth.isAuthenticated || !auth.user) {
        return;
      }

      // Check if token is expired or about to expire
      if (isTokenExpired(auth.user, 60)) {
        // Check if refresh token is available
        if (!hasRefreshToken(auth.user)) {
          console.error("No refresh token available");
          setRefreshError(
            "セッションが期限切れです。再度ログインしてください。",
          );
          return;
        }

        try {
          setIsRefreshing(true);
          setRefreshError(null);
          console.log("Access token expired. Attempting silent refresh...");

          await auth.signinSilent();

          console.log("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token:", error);
          setRefreshError(
            "トークンの更新に失敗しました。再度ログインしてください。",
          );

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

  // Show loading state while refreshing
  if (isRefreshing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-600">認証情報を更新中...</p>
        </div>
      </div>
    );
  }

  // Show error message if refresh failed
  if (refreshError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="text-red-600">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">認証エラー</h2>
          <p className="text-gray-600">{refreshError}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
