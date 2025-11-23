import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { InvitationCreateType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const createSystemInvitation = createServerFn({
  method: "POST",
}).handler(async () => {
  const client = hc<InvitationCreateType>(env.BACKEND_API);
  const response = await client.invitation.create.$post({
    json: {
      createdBy: "system",
      expirationHours: 24,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${await response.text()}`);
  }
  return response.json();
});
