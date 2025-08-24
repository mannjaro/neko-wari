import { Hono } from "hono";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { zValidator } from "@hono/zod-validator";

import { z } from "zod";

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
const monthlyGet = app.get(
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

const detailUpdate = app.put("/user/:uid/detail/:id");

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

export default app;
