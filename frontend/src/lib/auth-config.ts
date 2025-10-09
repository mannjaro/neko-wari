import type { AuthConfig } from "@/types/auth";

export const getAuthConfig = (): AuthConfig => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

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

  const region = process.env.AWS_REGION || userPoolRegion;

  return {
    userPoolId,
    clientId,
    region,
    userPoolName,
  };
};
