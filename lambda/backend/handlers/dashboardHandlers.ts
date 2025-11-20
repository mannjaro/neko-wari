import type { Context } from "hono";
import { Logger } from "@aws-lambda-powertools/logger";
import { dashboardService } from "../services/dashboardService";
import {
  monthlySummaryResponseSchema,
  userDetailResponseSchema,
  categorySummaryResponseSchema,
  errorResponseSchema,
} from "../schemas/responseSchema";

const logger = new Logger({ serviceName: "dashboardHandlers" });

export const monthlyDashboardHandler = async (
  c: Context,
  year: string,
  month: string,
) => {
  const yearMonth = `${year}-${month}`;
  try {
    const summary = await dashboardService.generateMonthlySummary(yearMonth);
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
  month: string,
) => {
  const yearMonth = `${year}-${month}`;
  try {
    const userDetails = await dashboardService.getUserDetailData(
      userId,
      yearMonth,
    );
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
  month: string,
) => {
  const yearMonth = `${year}-${month}`;
  try {
    const categorySummary =
      await dashboardService.generateCategorySummary(yearMonth);
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
