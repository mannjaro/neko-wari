import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import { UpdateCostDataSchema } from "@/types/shared";
import type { DetailUpdateType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const ExtendedUpdateCostDataSchema = UpdateCostDataSchema.extend({
  uid: z.string(),
  timestamp: z.string(),
});

export type ExtendedUpdateCostData = z.infer<
  typeof ExtendedUpdateCostDataSchema
>;

const UpdateCostDetailInputSchema = z.object({
  data: ExtendedUpdateCostDataSchema,
  accessToken: z.string(),
});

export const updateCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(UpdateCostDetailInputSchema)
  .handler(async ({ data: input }) => {
    const client = hc<DetailUpdateType>(env.BACKEND_API);
    const response = await client.user[":uid"].detail[":timestamp"].$put({
      json: {
        ...input.data,
      },
      param: {
        uid: input.data.uid,
        timestamp: input.data.timestamp,
      },
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
