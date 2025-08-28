import { z } from "zod";
import {
  PaymentCategorySchema,
  MonthlySummaryResponseSchema,
  UserDetailResponseSchema,
  CategorySummaryResponseSchema,
  type MonthlySummaryResponse,
  type UserDetailResponse,
  type CategorySummaryResponse,
} from "../../shared/types";

// Base error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
});

// Cost data item schema for user details
export const costDataItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  GSI1PK: z.string().optional(),
  GSI1SK: z.string().optional(),
  EntityType: z.literal("COST_DATA"),
  CreatedAt: z.string(),
  UpdatedAt: z.string(),
  User: z.string(),
  Category: PaymentCategorySchema,
  Memo: z.string(),
  Price: z.number(),
  Timestamp: z.number(),
  YearMonth: z.string(),
});

// Re-export monthly summary response schema from shared types
export const monthlySummaryResponseSchema = MonthlySummaryResponseSchema;

// Re-export user detail response schema from shared types
export const userDetailResponseSchema = UserDetailResponseSchema;

// Re-export category summary response schema from shared types
export const categorySummaryResponseSchema = CategorySummaryResponseSchema;

// Type exports for use in handlers
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type CostDataItemResponse = z.infer<typeof costDataItemSchema>;
// Re-export types from shared types
export type {
  MonthlySummaryResponse,
  UserDetailResponse,
  CategorySummaryResponse,
};
