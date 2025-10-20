import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import type app from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const DeleteCostDataSchema = z.object({
  uid: z.string(),
  timestamp: z.string(),
});

export type DeleteCostData = z.infer<typeof DeleteCostDataSchema>;

export const deleteCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(DeleteCostDataSchema)
  .handler(async ({ data }) => {
    const client = hc<typeof app>(env.BACKEND_API);
    const response = await client.user[":uid"].detail[":timestamp"].$delete({
      param: {
        uid: data.uid,
        timestamp: data.timestamp,
      },
    });
    if (!response.ok) {
      throw new Error("Delete failed");
    }
    return response.json();
  });
