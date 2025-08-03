// getServerTime.ts
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "../../../lambda/backend/app";
import { getBindings } from "@/utils/binding";

export const getMonthlyCost = createServerFn({
  method: "GET",
}).handler(async () => {
  const env = getBindings();
  const client = hc<AppType>(env.BACKEND_API);
  const response = await client.dashboard.monthly.$get({
    query: {
      month: "08",
      year: "2025",
    },
  });
  if (!response.ok) {
    throw new Error("Fetch failed");
  }
  return response.json();
});
