import { z } from "zod";
import {
  PaymentCategorySchema,
  MonthlySummaryResponseSchema,
  UserDetailResponseSchema,
  CategorySummaryResponseSchema,
  CostDataItemSchema,
  type MonthlySummaryResponse,
  type UserDetailResponse,
  type CategorySummaryResponse,
  type CostDataItem,
} from "../../shared/types";

// Base error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
});

// Re-export cost data item schema from shared types
export const costDataItemSchema = CostDataItemSchema;

// Re-export monthly summary response schema from shared types
export const monthlySummaryResponseSchema = MonthlySummaryResponseSchema;

// Re-export user detail response schema from shared types
export const userDetailResponseSchema = UserDetailResponseSchema;

// Re-export category summary response schema from shared types
export const categorySummaryResponseSchema = CategorySummaryResponseSchema;

// Type exports for use in handlers
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
// Re-export types from shared types
export type CostDataItemResponse = CostDataItem;
export type {
  MonthlySummaryResponse,
  UserDetailResponse,
  CategorySummaryResponse,
};
