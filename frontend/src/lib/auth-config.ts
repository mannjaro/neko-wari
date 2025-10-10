import type { AuthConfig } from "@/types/auth";
import { getBindings } from "@/utils/binding";

export const getAuthConfig = (): AuthConfig => {
  const env = getBindings();
  const userPoolId = env.COGNITO_USER_POOL_ID;
  const clientId = env.COGNITO_CLIENT_ID;

  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is not set");
  }

  if (!clientId) {
    throw new Error("COGNITO_CLIENT_ID is not set");
  }

  const [userPoolRegion, userPoolName] = userPoolId.split("_");

  if (!userPoolRegion || !userPoolName) {
    throw new Error("Invalid User Pool ID format");
  }

  const region = userPoolRegion;

  return {
    userPoolId,
    clientId,
    region,
    userPoolName,
  };
};
