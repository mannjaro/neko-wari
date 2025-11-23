import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { SystemInitStatusType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const getSystemInitStatus = createServerFn({
  method: "GET",
}).handler(async () => {
  const client = hc<SystemInitStatusType>(env.BACKEND_API);
  const response = await client.system["init-status"].$get();

  if (!response.ok) {
    throw new Error(`Fetch failed ${await response.text()}`);
  }
  return response.json();
});
