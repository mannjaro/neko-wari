import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { CreateCostDataSchema } from "@/types/shared";
import type { CostCreateType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export type CreateCostData = typeof CreateCostDataSchema._type;

export const createCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(CreateCostDataSchema)
  .handler(async ({ data }) => {
    const client = hc<CostCreateType>(env.BACKEND_API);
    const response = await client.cost.create.$post({
      json: data,
    });
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    return response.json();
  });
