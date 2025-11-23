import { WebStorageStateStore } from "oidc-client-ts";
import type { AuthContextProps } from "react-oidc-context";

export const CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID || "your-client-id-here";
export const COGNITO_DOMAIN =
  import.meta.env.VITE_COGNITO_DOMAIN ||
  "https://your-cognito-domain.auth.ap-northeast-1.amazoncognito.com";
export const REDIRECT_URI = import.meta.env.DEV
  ? import.meta.env.VITE_REDIRECT_URI || "http://localhost:3000"
  : import.meta.env.VITE_REDIRECT_URI;

export const cognitoAuthConfig = {
  authority:
    import.meta.env.VITE_COGNITO_AUTHORITY_URL ||
    "https://cognito-idp.ap-northeast-1.amazonaws.com/your-user-pool-id",
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: "aws.cognito.signin.user.admin email openid phone profile",
  automaticSilentRenew: true,
  loadUserInfo: true,
  // Increase the silent renew timeout to handle longer refresh operations
  silentRequestTimeoutInSeconds: 30,
  // Configure token refresh to happen before expiration (60 seconds before)
  accessTokenExpiringNotificationTimeInSeconds: 60,
  userStore:
    typeof window !== "undefined"
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined,
};

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthContextProps["user"];
  isLoading: boolean;
  signinRedirect: AuthContextProps["signinRedirect"];
}
