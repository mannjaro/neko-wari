import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hc } from "hono/client";
import type { DetailUpdateType } from "../../../lambda/backend/app";

import { getBindings } from "@/utils/binding";

export const updateCostDetail = createServerFn({
  method: "POST",
}).handler(async ({ data }) => {
  const env = getBindings();
  const client = hc<DetailUpdateType>(env.BACKEND_API);
});
