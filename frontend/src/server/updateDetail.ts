import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hc } from "hono/client";
import { UpdateCostDataSchema } from "../../../lambda/shared/types";
import type { DetailUpdateType } from "../../../lambda/backend/app";

import { getBindings } from "@/utils/binding";

export const updateCostDetail = createServerFn({
  method: "POST",
})
  .validator((req: unknown) => {
    const extendedSchema = UpdateCostDataSchema.extend({
      uid: z.string(),
      timestamp: z.string(),
    });
    return extendedSchema.parse(req);
  })
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
