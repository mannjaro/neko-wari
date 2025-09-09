import type { AuthConfig } from '@/types/auth';

export const getAuthConfig = (): AuthConfig => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID || "ap-northeast-1_k3Oz2eZ3E";
  const clientId = process.env.COGNITO_CLIENT_ID || "3rsdcgnbj0cfetdhgpd5s889lf";
  const region = process.env.AWS_REGION || "ap-northeast-1";
  
  // User Pool Name は User Pool ID の　アンダースコア後の文字列
  const userPoolName = userPoolId.split("_")[1];
  
  if (!userPoolName) {
    throw new Error("Invalid User Pool ID format");
  }
  
  return {
    userPoolId,
    clientId,
    region,
    userPoolName
  };
};