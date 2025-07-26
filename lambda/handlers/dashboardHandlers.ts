import type { Context } from "hono";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  generateMonthlySummary,
  getUserDetailData,
  generateCategorySummary,
} from "../services/dynamodb";
import {
  monthlySummaryResponseSchema,
  userDetailResponseSchema,
  categorySummaryResponseSchema,
  errorResponseSchema,
} from "../schemas/responseSchemas";

const logger = new Logger({ serviceName: "dashboardHandlers" });

export const monthlyDashboardHandler = async (
  c: Context,
  year: string,
  month: string
) => {
  const yearMonth = `${year}-${month}`;
  try {
    const summary = await generateMonthlySummary(yearMonth);
    const validatedSummary = monthlySummaryResponseSchema.parse(summary);
    return c.json(validatedSummary);
  } catch (error) {
    logger.error("Error in monthly dashboard API", { error });
    const errorResponse = errorResponseSchema.parse({
      error: "Internal server error",
    });
    return c.json(errorResponse, 500);
  }
};

export const userDetailsHandler = async (
  c: Context,
  userId: string,
  year: string,
  month: string
) => {
  const yearMonth = `${year}-${month}`;
  try {
    const userDetails = await getUserDetailData(userId, yearMonth);
    const validatedUserDetails = userDetailResponseSchema.parse(userDetails);
    return c.json(validatedUserDetails);
  } catch (error) {
    logger.error("Error in user details dashboard API", { error });
    if (error instanceof Error && error.message.includes("No data found")) {
      const errorResponse = errorResponseSchema.parse({ error: error.message });
      return c.json(errorResponse, 404);
    }
    const errorResponse = errorResponseSchema.parse({
      error: "Internal server error",
    });
    return c.json(errorResponse, 500);
  }
};

export const categorySummaryHandler = async (
  c: Context,
  year: string,
  month: string
) => {
  try {
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      const errorResponse = errorResponseSchema.parse({
        error: "yearMonth must be in ?year=YYYY&month=MM format",
      });
      return c.json(errorResponse, 400);
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      const errorResponse = errorResponseSchema.parse({
        error: "yearMonth must be in ?year=YYYY&month=MM format",
      });
      return c.json(errorResponse, 400);
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      const errorResponse = errorResponseSchema.parse({
        error: "yearMonth must be in ?year=YYYY&month=MM format",
      });
      return c.json(errorResponse, 400);
    }

    const yearMonth = `${year}-${month}`;

    if (!yearMonth) {
      const errorResponse = errorResponseSchema.parse({
        error: "yearMonth parameter is required",
      });
      return c.json(errorResponse, 400);
    }

    // Validate yearMonth format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      const errorResponse = errorResponseSchema.parse({
        error: "yearMonth must be in YYYY-MM format",
      });
      return c.json(errorResponse, 400);
    }

    const categorySummary = await generateCategorySummary(yearMonth);
    const validatedCategorySummary =
      categorySummaryResponseSchema.parse(categorySummary);
    return c.json(validatedCategorySummary);
  } catch (error) {
    logger.error("Error in category summary dashboard API", { error });
    const errorResponse = errorResponseSchema.parse({
      error: "Internal server error",
    });
    return c.json(errorResponse, 500);
  }
};
