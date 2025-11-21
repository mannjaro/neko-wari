import { WebStorageStateStore } from "oidc-client-ts";
import type { AuthContextProps } from "react-oidc-context";

export const CLIENT_ID = "52egt02nn47oubgatq6vadtgs4";
export const COGNITO_DOMAIN =
  "https://payment-dashboard.auth.ap-northeast-1.amazoncognito.com";
export const REDIRECT_URI = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://advanced-payment-dashboard.zk-****.workers.dev";

export const cognitoAuthConfig = {
  authority:
    "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_ntfS5MRXx",
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
