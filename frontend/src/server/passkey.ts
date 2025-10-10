import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createAuthService } from "./auth";
import { AuthError } from "@/types/auth";

const StartRegistrationSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

const CompleteRegistrationSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  credential: z.any(),
});

export const startPasskeyRegistration = createServerFn({
  method: "POST",
})
  .inputValidator(StartRegistrationSchema)
  .handler(async ({ data }) => {
    const authService = await createAuthService();

    try {
      return await authService.startPasskeyRegistration({
        accessToken: data.accessToken,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(`Passkey registration start failed: ${error.message}`);
      }

      throw error;
    }
  });

export const completePasskeyRegistration = createServerFn({
  method: "POST",
})
  .inputValidator(CompleteRegistrationSchema)
  .handler(async ({ data }) => {
    const authService = await createAuthService();

    try {
      await authService.completePasskeyRegistration({
        accessToken: data.accessToken,
        credential: data.credential,
      });

      return { status: "SUCCESS" } as const;
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(
          `Passkey registration completion failed: ${error.message}`,
        );
      }

      throw error;
    }
  });
