import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { z } from "zod";
import { CreateInvitationSchema } from "@/types/shared";
import type { InvitationCreateType } from "../../../lambda/backend/app";

export type CreateInvitationData = z.infer<typeof CreateInvitationSchema>;

export const createInvitation = createServerFn({
  method: "POST",
})
  .inputValidator(CreateInvitationSchema)
  .handler(async ({ data }) => {
    const client = hc<InvitationCreateType>(env.BACKEND_API);
    const response = await client.invitation.create.$post({
      json: data,
    });
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    return response.json();
  });
