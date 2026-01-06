import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import type { SettlementMonthlyGetType } from "../../../lambda/backend/app";

export const getMonthlySettlements = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const client = hc<SettlementMonthlyGetType>(env.BACKEND_API);
    const response = await client.settlement.monthly[":yearMonth"].$get({
      param: {
        yearMonth: data.yearMonth,
      },
    });
    if (!response.ok) {
      // Return empty array if not found (404) or other errors
      if (response.status === 404) {
        return [];
      }
      throw new Error("Failed to fetch monthly settlements");
    }
    return response.json();
  });
