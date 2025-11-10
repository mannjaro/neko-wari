import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import { CreateCostDataSchema } from "@/types/shared";
import type { CostCreateType } from "../../../lambda/backend/app";

export type CreateCostData = z.infer<typeof CreateCostDataSchema>;

// Extended schema that includes the access token
const CreateCostDetailInputSchema = z.object({
  data: CreateCostDataSchema,
  accessToken: z.string(),
});

export const createCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(CreateCostDetailInputSchema)
  .handler(async ({ data: input }) => {
    const client = hc<CostCreateType>(env.BACKEND_API);
    const response = await client.cost.create.$post({
      json: input.data,
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  });
