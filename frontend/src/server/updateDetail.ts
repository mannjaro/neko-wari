import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import { UpdateCostDataSchema } from "@/types/shared";
import type { DetailUpdateType } from "../../../lambda/backend/app";
import { env } from "cloudflare:workers";

export const ExtendedUpdateCostDataSchema = UpdateCostDataSchema.extend({
  uid: z.string(),
  id: z.string(),
});

export type ExtendedUpdateCostData = z.infer<
  typeof ExtendedUpdateCostDataSchema
>;

export const updateCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(ExtendedUpdateCostDataSchema)
  .handler(async ({ data }) => {
    const client = hc<DetailUpdateType>(env.BACKEND_API);
    const response = await client.user[":uid"].detail[":id"].$put({
      json: {
        ...data,
      },
      param: {
        uid: data.uid,
        id: data.id,
      },
    });
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    return response.json();
  });
