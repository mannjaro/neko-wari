import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { z } from "zod";
import { UpdateCostDataSchema } from "@/types/shared";
import { getBindings } from "@/utils/binding";
import type { DetailUpdateType } from "../../../lambda/backend/app";

export const ExtendedUpdateCostDataSchema = UpdateCostDataSchema.extend({
  uid: z.string(),
  timestamp: z.string(),
});

export type ExtendedUpdateCostData = z.infer<
  typeof ExtendedUpdateCostDataSchema
>;

export const updateCostDetail = createServerFn({
  method: "POST",
})
  .inputValidator(ExtendedUpdateCostDataSchema)
  .handler(async ({ data }) => {
    const env = getBindings();
    const client = hc<DetailUpdateType>(env.BACKEND_API);
    const response = await client.user[":uid"].detail[":timestamp"].$put({
      json: {
        ...data,
      },
      param: {
        uid: data.uid,
        timestamp: data.timestamp,
      },
    });
    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    return response.json();
  });
