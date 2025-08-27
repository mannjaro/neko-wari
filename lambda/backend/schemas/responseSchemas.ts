import { z } from "zod";

// Base error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
});

// Payment category enum schema
export const paymentCategorySchema = z.enum([
  "rent",
  "transportation",
  "utilities",
  "furniture",
  "daily",
  "other",
]);

// Transaction item schema for category breakdown
const transactionItemSchema = z.object({
  amount: z.number(),
  memo: z.string(),
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
  Category: paymentCategorySchema,
  Memo: z.string(),
  Price: z.number(),
  Timestamp: z.number(),
  YearMonth: z.string(),
});

// User summary schema
const userSummarySchema = z.object({
  userId: z.string(),
  user: z.string(),
  totalAmount: z.number(),
  transactionCount: z.number(),
  categoryBreakdown: z.record(z.string(), z.array(transactionItemSchema)),
});

// Monthly summary response schema
export const monthlySummaryResponseSchema = z.object({
  yearMonth: z.string(),
  totalAmount: z.number(),
  totalTransactions: z.number(),
  userSummaries: z.array(userSummarySchema),
});

// User detail response schema
export const userDetailResponseSchema = z.object({
  userId: z.string(),
  user: z.string(),
  yearMonth: z.string(),
  transactions: z.array(costDataItemSchema),
  summary: z.object({
    totalAmount: z.number(),
    transactionCount: z.number(),
    categoryBreakdown: z.record(z.string(), z.array(transactionItemSchema)),
  }),
});

// Category summary item schema
const categorySummaryItemSchema = z.object({
  category: paymentCategorySchema,
  totalAmount: z.number(),
  transactionCount: z.number(),
  userBreakdown: z.record(z.string(), z.number()),
});

// Category summary response schema
export const categorySummaryResponseSchema = z.object({
  yearMonth: z.string(),
  categories: z.array(categorySummaryItemSchema),
});

// Type exports for use in handlers
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type MonthlySummaryResponse = z.infer<
  typeof monthlySummaryResponseSchema
>;
export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>;
export type CategorySummaryResponse = z.infer<
  typeof categorySummaryResponseSchema
>;
export type CostDataItemResponse = z.infer<typeof costDataItemSchema>;
