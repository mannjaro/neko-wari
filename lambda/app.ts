import { Hono } from "hono";
import { env } from "hono/adapter";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { zValidator } from "@hono/zod-validator";

import { z } from "zod";

import { webhookHandler } from "./handlers/webhookHandler";
import {
  monthlyDashboardHandler,
  userDetailsHandler,
  categorySummaryHandler,
} from "./handlers/dashboardHandlers";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Status: OK"));

// Dashboard API endpoints
app.get(
  "/dashboard/monthly",
  zValidator(
    "query",
    z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    })
  ),
  // monthlyDashboardHandler
  (c) => {
    const { year, month } = c.req.valid("query");
    return monthlyDashboardHandler(c, year, month);
  }
);
app.get(
  "/dashboard/user/details",
  zValidator(
    "query",
    z.object({
      userId: z.string(),
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    })
  ),
  (c) => {
    const { userId, year, month } = c.req.valid("query");
    return userDetailsHandler(c, userId, year, month);
  }
);
app.get(
  "/dashboard/category/summary",
  zValidator(
    "query",
    z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    })
  ),
  (c) => {
    const { year, month } = c.req.valid("query");
    return categorySummaryHandler(c, year, month);
  }
);

app.post("/webhook", async (c) => {
  try {
    const reqBody = c.env.event.body || "";
    const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = env<{
      LINE_CHANNEL_ACCESS_TOKEN: string;
      LINE_CHANNEL_SECRET: string;
    }>(c);

    const result = await webhookHandler(
      reqBody,
      LINE_CHANNEL_ACCESS_TOKEN,
      LINE_CHANNEL_SECRET
    );

    c.status(200);
    return c.text(result);
  } catch (error) {
    c.status(500);
    return c.text("Error processing webhook");
  }
});

export type AppType = typeof app;

export default app;
