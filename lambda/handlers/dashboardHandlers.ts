import type { Context } from "hono";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  generateMonthlySummary,
  getUserDetailData,
  generateCategorySummary,
} from "../services/dynamodb";

const logger = new Logger({ serviceName: "dashboardHandlers" });

export const monthlyDashboardHandler = async (c: Context) => {
  try {
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;
    const summary = await generateMonthlySummary(yearMonth);
    return c.json(summary);
  } catch (error) {
    logger.error("Error in monthly dashboard API", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
};

export const userDetailsHandler = async (c: Context) => {
  try {
    const userId = c.req.query("userId");
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;

    if (!userId || !yearMonth) {
      return c.json(
        { error: "userId and yearMonth parameters are required" },
        400
      );
    }

    // Validate yearMonth format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "yearMonth must be in YYYY-MM format" }, 400);
    }

    const userDetails = await getUserDetailData(userId, yearMonth);
    return c.json(userDetails);
  } catch (error) {
    logger.error("Error in user details dashboard API", { error });

    if (error instanceof Error && error.message.includes("No data found")) {
      return c.json({ error: error.message }, 404);
    }

    return c.json({ error: "Internal server error" }, 500);
  }
};

export const categorySummaryHandler = async (c: Context) => {
  try {
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;

    if (!yearMonth) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "yearMonth must be in YYYY-MM format" }, 400);
    }

    const categorySummary = await generateCategorySummary(yearMonth);
    return c.json(categorySummary);
  } catch (error) {
    logger.error("Error in category summary dashboard API", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
};
