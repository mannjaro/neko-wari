import { Hono } from "hono";
import { logger } from "hono/logger";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { zValidator } from "@hono/zod-validator";
import { Logger } from "@aws-lambda-powertools/logger";

import { z } from "zod";

import {
  monthlyDashboardHandler,
  userDetailsHandler,
  categorySummaryHandler,
} from "./features/dashboard/dashboardHandlers";

import {
  CreateCostDetailSchema,
  UpdateCostDetailSchema,
  CreateUserSchema,
} from "./schemas/requestSchema";

import {
  createCostHandler,
  updateCostHandler,
  deleteCostHandler,
} from "./features/cost/costHandlers";

import {
  createInvitationHandler,
  getInvitationHandler,
  lineLoginCallbackHandler,
  listInvitationsHandler,
  revokeInvitationHandler,
} from "./features/invitation/invitationHandlers";

import { CreateInvitationSchema } from "../shared/types";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const appLogger = new Logger({ serviceName: "backend" });

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());

app.onError((err, c) => {
  appLogger.error("Unhandled error", { error: err });
  return c.json({ message: "Internal Server Error" }, 500);
});

app.get("/", (c) => c.text("Status: OK"));

// Create new cost entry
export const costCreate = app.post(
  "/cost/create",
  zValidator("json", CreateCostDetailSchema),
  async (c) => {
    const body = c.req.valid("json");
    return createCostHandler(c, body);
  },
);

// Dashboard API endpoints
export const monthlyGet = app.get(
  "/dashboard/monthly",
  zValidator(
    "query",
    z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    }),
  ),
  // monthlyDashboardHandler
  (c) => {
    const { year, month } = c.req.valid("query");
    return monthlyDashboardHandler(c, year, month);
  },
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
  },
);

export const detailDelete = app.delete(
  "/user/:uid/detail/:timestamp",
  async (c) => {
    const { uid, timestamp } = c.req.param();
    return deleteCostHandler(c, uid, timestamp);
  },
);

app.post("/user", zValidator("json", CreateUserSchema), async (c) => {
  const body = c.req.valid("json");
  // Implement user creation logic here
  return c.json({ message: "User created", user: body });
});

app.get(
  "/dashboard/user/details",
  zValidator(
    "query",
    z.object({
      userId: z.string(),
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    }),
  ),
  (c) => {
    const { userId, year, month } = c.req.valid("query");
    return userDetailsHandler(c, userId, year, month);
  },
);
app.get(
  "/dashboard/category/summary",
  zValidator(
    "query",
    z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{2}$/),
    }),
  ),
  (c) => {
    const { year, month } = c.req.valid("query");
    return categorySummaryHandler(c, year, month);
  },
);

// Invitation API endpoints
export const invitationCreate = app.post(
  "/invitation/create",
  zValidator("json", CreateInvitationSchema),
  async (c) => {
    const body = c.req.valid("json");
    return createInvitationHandler(c, body);
  },
);

// Define static routes before dynamic routes to prevent shadowing
export const invitationCallback = app.get("/invitation/callback", async (c) => {
  return lineLoginCallbackHandler(c);
});

export const invitationList = app.get("/invitation/list", async (c) => {
  return listInvitationsHandler(c);
});

export const invitationGet = app.get("/invitation/:token", async (c) => {
  return getInvitationHandler(c);
});

export const invitationRevoke = app.delete(
  "/invitation/:invitationId",
  async (c) => {
    return revokeInvitationHandler(c);
  },
);

export type CostCreateType = typeof costCreate;
export type MonthlyGetType = typeof monthlyGet;
export type DetailUpdateType = typeof detailUpdate;
export type DetailDeleteType = typeof detailDelete;
export type InvitationCreateType = typeof invitationCreate;
export type InvitationListType = typeof invitationList;
export type InvitationRevokeType = typeof invitationRevoke;

export default app;
