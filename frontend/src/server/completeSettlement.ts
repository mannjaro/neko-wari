import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import { CompleteSettlementSchema } from "@shared/types";
import type { SettlementCompleteType } from "../../../lambda/backend/app";

export const completeSettlement = createServerFn({
  method: "POST",
})
  .inputValidator(CompleteSettlementSchema)
  .handler(async ({ data }) => {
    const client = hc<SettlementCompleteType>(env.BACKEND_API);
    const response = await client.settlement.complete.$post({
      json: data,
    });
    if (!response.ok) {
      throw new Error("Failed to complete settlement");
    }
    return response.json();
  });
