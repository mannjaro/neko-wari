import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import type { UserUpdateDisplayNameType } from "../../../lambda/backend/app";

const UpdateDisplayNameSchema = z.object({
  lineUserId: z.string(),
  displayName: z.string(),
});

export const updateDisplayName = createServerFn({ method: "POST" })
  .inputValidator(UpdateDisplayNameSchema)
  .handler(async ({ data }) => {
    const client = hc<UserUpdateDisplayNameType>(env.BACKEND_API);
    const response = await client.users[":lineUserId"]["display-name"].$put({
      param: { lineUserId: data.lineUserId },
      json: { displayName: data.displayName },
    });
    if (!response.ok) {
      const errorData = (await response.json()) as
        | { error: string }
        | { user: unknown };
      const errorMessage =
        "error" in errorData
          ? errorData.error
          : "Failed to update display name";
      throw new Error(errorMessage);
    }
    return response.json();
  });
