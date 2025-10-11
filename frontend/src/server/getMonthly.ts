// getServerTime.ts
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import type { MonthlyGetType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

const Partition = z.object({
  year: z.number().min(2025),
  month: z.number().min(1).max(12),
});

export const getMonthlyCost = createServerFn({
  method: "GET",
})
  .inputValidator((partition: unknown) => {
    const data = Partition.parse(partition);
    return {
      year: data.year.toString(),
      month: data.month.toString().padStart(2, "0"),
    };
  })
  .handler(async ({ data: { year, month } }) => {
    const client = hc<MonthlyGetType>(env.BACKEND_API);
    const response = await client.dashboard.monthly.$get({
      query: {
        month,
        year,
      },
    });
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    return response.json();
  });
