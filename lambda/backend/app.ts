import { Hono } from "hono";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { zValidator } from "@hono/zod-validator";

import { z } from "zod";

import {
  monthlyDashboardHandler,
  userDetailsHandler,
  categorySummaryHandler,
} from "./handlers/dashboardHandlers";

import { UpdateCostDetailSchema } from "./schemas/requestSchema";

import { updateCostHandler, deleteCostHandler } from "./handlers/updateHandlers";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Status: OK"));

// Dashboard API endpoints
export const monthlyGet = app.get(
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

export const detailUpdate = app.put(
  "/user/:uid/detail/:timestamp",
  zValidator("json", UpdateCostDetailSchema),
  async (c) => {
    const { uid, timestamp } = c.req.param();
    const body = await c.req.valid("json");
    const now = new Date().toISOString();
    const req = { ...body, updatedAt: now };
    console.log(uid, timestamp, body);
    return updateCostHandler(c, uid, timestamp, req);
  }
);

export const detailDelete = app.delete(
  "/user/:uid/detail/:timestamp",
  async (c) => {
    const { uid, timestamp } = c.req.param();
    return deleteCostHandler(c, uid, timestamp);
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

export type MonthlyGetType = typeof monthlyGet;
export type DetailUpdateType = typeof detailUpdate;
export type DetailDeleteType = typeof detailDelete;

// Export app type for RPC client
export type AppType = typeof app;

export default app;
