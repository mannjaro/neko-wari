import { createServerFn } from "@tanstack/react-start";

import { getAuthConfig } from "@/lib/auth-config";
import type { AuthTokens } from "@/types/auth";
import { AuthError } from "@/types/auth";
import { LoginFormSchema } from "@/types";
import { CognitoAuthService } from "./cognito-auth";

// 認証サービスのインスタンスを作成する関数
function createAuthService(): CognitoAuthService {
  const config = getAuthConfig();
  return new CognitoAuthService(config);
}

export const startAuth = createServerFn({
  method: "POST",
})
  .validator(LoginFormSchema)
  .handler(async ({ data }) => {
    const username = data.email;
    const password = data.password;

    try {
      const response = await signIn(username, password);
      return response;
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw error;
    }
  });

export const signIn = async (
  username: string,
  password: string
): Promise<AuthTokens> => {
  const authService = createAuthService();
  return await authService.signIn(username, password);
};
