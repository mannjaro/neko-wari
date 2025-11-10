import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import type { DetailDeleteType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const DeleteCostDataSchema = z.object({
  uid: z.string(),
  timestamp: z.string(),
});

export type DeleteCostData = z.infer<typeof DeleteCostDataSchema>;

const DeleteCostDetailInputSchema = z.object({
  data: DeleteCostDataSchema,
  accessToken: z.string(),
});

export const deleteCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(DeleteCostDetailInputSchema)
  .handler(async ({ data: input }) => {
    const client = hc<DetailDeleteType>(env.BACKEND_API);
    const response = await client.user[":uid"].detail[":timestamp"].$delete({
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
      throw new Error(`Delete failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  });
