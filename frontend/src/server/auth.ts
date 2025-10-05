import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";

import { getAuthConfig } from "@/lib/auth-config";
import { AuthError } from "@/types/auth";
import { LoginFormSchema } from "@/types";
import { CognitoAuthService } from "./cognito-auth";

// 認証サービスのインスタンスを作成する関数
export function createAuthService(): CognitoAuthService {
  const config = getAuthConfig();
  return new CognitoAuthService(config);
}

const StartAuthSchema = LoginFormSchema.extend({
  mode: z.literal("START"),
});

const RespondAuthSchema = z.object({
  mode: z.literal("RESPOND"),
  username: z.string().min(1),
  session: z.string().min(1),
  challengeName: z.enum(ChallengeNameType),
  answers: z.record(z.string(), z.string().min(1)),
});

const AuthRequestSchema = z.discriminatedUnion("mode", [
  StartAuthSchema,
  RespondAuthSchema,
]);

export const startAuth = createServerFn({
  method: "POST",
})
  .validator(AuthRequestSchema)
  .handler(async ({ data }) => {
    const authService = createAuthService();

    try {
      if (data.mode === "START") {
        return await authService.startAuth(data.email, data.password);
      }

      return await authService.respondToChallenge({
        username: data.username,
        session: data.session,
        challengeName: data.challengeName,
        answers: data.answers,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw error;
    }
  });
