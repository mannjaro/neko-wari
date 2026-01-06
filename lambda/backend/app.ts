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
  getSystemInitStatusHandler,
} from "./features/invitation/invitationHandlers";

import {
  listUsersHandler,
  updateDisplayNameHandler,
} from "./features/user/userHandlers";

import {
  createSettlementHandler,
  completeSettlementHandler,
  cancelSettlementHandler,
  getSettlementHandler,
  getMonthlySettlementsHandler,
  getUserSettlementsHandler,
} from "./features/settlement/settlementHandlers";

import { UpdateDisplayNameSchema } from "./features/user/schemas";

import {
  CreateInvitationSchema,
  CreateSettlementSchema,
  CompleteSettlementSchema,
} from "../shared/types";

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

export const systemInitStatus = app.get("/system/init-status", async (c) => {
  return getSystemInitStatusHandler(c);
});

// User API endpoints
export const userList = app.get("/users", async (c) => {
  return listUsersHandler(c);
});

export const userUpdateDisplayName = app.put(
  "/users/:lineUserId/display-name",
  zValidator("json", UpdateDisplayNameSchema),
  async (c) => {
    const { lineUserId } = c.req.param();
    const { displayName } = c.req.valid("json");
    return updateDisplayNameHandler(c, lineUserId, displayName);
  },
);

// Settlement API endpoints
export const settlementCreate = app.post(
  "/settlement/create",
  zValidator("json", CreateSettlementSchema),
  async (c) => {
    const body = c.req.valid("json");
    return createSettlementHandler(c, body);
  },
);

export const settlementComplete = app.post(
  "/settlement/complete",
  zValidator("json", CompleteSettlementSchema),
  async (c) => {
    const body = c.req.valid("json");
    return completeSettlementHandler(c, body);
  },
);

export const settlementCancel = app.delete(
  "/settlement/:userId/:yearMonth",
  async (c) => {
    const { userId, yearMonth } = c.req.param();
    return cancelSettlementHandler(c, userId, yearMonth);
  },
);

export const settlementGet = app.get(
  "/settlement/:userId/:yearMonth",
  async (c) => {
    const { userId, yearMonth } = c.req.param();
    return getSettlementHandler(c, userId, yearMonth);
  },
);

export const settlementMonthlyGet = app.get(
  "/settlement/monthly/:yearMonth",
  async (c) => {
    const { yearMonth } = c.req.param();
    return getMonthlySettlementsHandler(c, yearMonth);
  },
);

export const settlementUserGet = app.get(
  "/settlement/user/:userId",
  async (c) => {
    const { userId } = c.req.param();
    return getUserSettlementsHandler(c, userId);
  },
);

export type CostCreateType = typeof costCreate;
export type MonthlyGetType = typeof monthlyGet;
export type DetailUpdateType = typeof detailUpdate;
export type DetailDeleteType = typeof detailDelete;
export type InvitationCreateType = typeof invitationCreate;
export type InvitationListType = typeof invitationList;
export type InvitationRevokeType = typeof invitationRevoke;
export type SystemInitStatusType = typeof systemInitStatus;
export type UserListType = typeof userList;
export type UserUpdateDisplayNameType = typeof userUpdateDisplayName;
export type SettlementCreateType = typeof settlementCreate;
export type SettlementCompleteType = typeof settlementComplete;
export type SettlementCancelType = typeof settlementCancel;
export type SettlementGetType = typeof settlementGet;
export type SettlementMonthlyGetType = typeof settlementMonthlyGet;
export type SettlementUserGetType = typeof settlementUserGet;

export default app;
