// Shared schema definitions for the LINE Bot application using Zod
import { z } from "zod";

// Payment category schema and type
export const PaymentCategorySchema = z.enum([
  "rent",
  "utilities",
  "furniture",
  "daily",
  "transportation",
  "other",
]);
export type PaymentCategory = z.infer<typeof PaymentCategorySchema>;

// User flow step schema and type
export const UserStepSchema = z.enum([
  "idle",
  "user_selected",
  "category_selected",
  "waiting_memo",
  "waiting_price",
  "confirming",
]);
export type UserStep = z.infer<typeof UserStepSchema>;

// Facet types for DynamoDB single table design
export const FacetTypeSchema = z.enum([
  "USER_STATE",
  "COST_DATA",
  "USER_PROFILE",
  "MONTHLY_SUMMARY",
]);
export type FacetType = z.infer<typeof FacetTypeSchema>;

// User state schema for session management
export const UserStateSchema = z.object({
  step: UserStepSchema,
  user: z.string().optional(),
  category: PaymentCategorySchema.optional(),
  memo: z.string().optional(),
  price: z.number().optional(),
});
export type UserState = z.infer<typeof UserStateSchema>;

// Base schema for all DynamoDB items
export const BaseDynamoItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  GSI1PK: z.string().optional(),
  GSI1SK: z.string().optional(),
  EntityType: FacetTypeSchema,
  CreatedAt: z.string(),
  UpdatedAt: z.string(),
});
export type BaseDynamoItem = z.infer<typeof BaseDynamoItemSchema>;

// User session state facet schema
export const UserStateItemSchema = BaseDynamoItemSchema.extend({
  EntityType: z.literal("USER_STATE"),
  PK: z.string(), // USER#{userId}
  SK: z.literal("SESSION#CURRENT"),
  GSI1PK: z.literal("USER_STATES"),
  GSI1SK: z.string(), // USER#{userId}#SESSION
  Step: UserStepSchema,
  User: z.string().optional(),
  Category: PaymentCategorySchema.optional(),
  Memo: z.string().optional(),
  Price: z.number().optional(),
  TTL: z.number(),
});
export type UserStateItem = z.infer<typeof UserStateItemSchema>;

// Cost transaction data facet schema
export const CostDataItemSchema = BaseDynamoItemSchema.extend({
  EntityType: z.literal("COST_DATA"),
  PK: z.string(), // USER#{userId}
  SK: z.string(), // COST#{timestamp}
  GSI1PK: z.string(), // COST#{YYYY-MM}
  GSI1SK: z.string(), // USER#{userId}#{timestamp}
  User: z.string(),
  Category: PaymentCategorySchema,
  Memo: z.string(),
  Price: z.number(),
  Timestamp: z.number(),
  YearMonth: z.string(), // YYYY-MM for monthly queries
});
export type CostDataItem = z.infer<typeof CostDataItemSchema>;

// Update Cost transaction data schema
export const UpdateCostDataSchema = z.object({
  userId: z.string().optional(),
  category: PaymentCategorySchema.optional(),
  memo: z.string().optional(),
  price: z.number().optional(),
  updatedAt: z.string(),
});
export type UpdateCostData = z.infer<typeof UpdateCostDataSchema>;

export const UpdateExpressionResultSchema = z.object({
  UpdateExpression: z.string(),
  ExpressionAttributeNames: z.record(z.string(), z.string()),
  ExpressionAttributeValues: z.record(z.string(), z.unknown()),
});
export type UpdateExpressionResult = z.infer<
  typeof UpdateExpressionResultSchema
>;

// User profile facet schema
export const UserProfileItemSchema = BaseDynamoItemSchema.extend({
  EntityType: z.literal("USER_PROFILE"),
  PK: z.string(), // USER#{userId}
  SK: z.literal("PROFILE#MAIN"),
  GSI1PK: z.literal("USER_PROFILES"),
  GSI1SK: z.string(), // USER#{userId}
  UserId: z.string(),
  DisplayName: z.string().optional(),
  DefaultCategory: PaymentCategorySchema.optional(),
  TotalSpent: z.number(),
  TransactionCount: z.number(),
  LastActivityAt: z.string(),
});
export type UserProfileItem = z.infer<typeof UserProfileItemSchema>;

// Monthly summary facet schema
export const MonthlySummaryItemSchema = BaseDynamoItemSchema.extend({
  EntityType: z.literal("MONTHLY_SUMMARY"),
  PK: z.string(), // USER#{userId}
  SK: z.string(), // SUMMARY#{YYYY-MM}
  GSI1PK: z.string(), // SUMMARY#{YYYY-MM}
  GSI1SK: z.string(), // USER#{userId}
  UserId: z.string(),
  YearMonth: z.string(), // YYYY-MM
  TotalAmount: z.number(),
  TransactionCount: z.number(),
  CategoryBreakdown: z.record(PaymentCategorySchema, z.number()),
  TopMemos: z.array(z.string()),
});
export type MonthlySummaryItem = z.infer<typeof MonthlySummaryItemSchema>;

// Union schema for all DynamoDB items
export const DynamoItemSchema = z.discriminatedUnion("EntityType", [
  UserStateItemSchema,
  CostDataItemSchema,
  UserProfileItemSchema,
  MonthlySummaryItemSchema,
]);
export type DynamoItem = z.infer<typeof DynamoItemSchema>;

// LINE Bot specific schemas
export const LineBotConfigSchema = z.object({
  channelAccessToken: z.string(),
  channelSecret: z.string(),
});
export type LineBotConfig = z.infer<typeof LineBotConfigSchema>;

export const WebhookEventContextSchema = z.object({
  userId: z.string(),
  replyToken: z.string(),
});
export type WebhookEventContext = z.infer<typeof WebhookEventContextSchema>;

// Dashboard API response schemas
export const UserSummarySchema = z.object({
  userId: z.string(),
  user: z.string(),
  totalAmount: z.number(),
  transactionCount: z.number(),
  categoryBreakdown: z.record(
    PaymentCategorySchema,
    z.array(
      z.object({
        amount: z.number(),
        memo: z.string(),
      }),
    ),
  ),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const MonthlySummaryResponseSchema = z.object({
  yearMonth: z.string(),
  totalAmount: z.number(),
  totalTransactions: z.number(),
  userSummaries: z.array(UserSummarySchema),
});
export type MonthlySummaryResponse = z.infer<
  typeof MonthlySummaryResponseSchema
>;

export const UserDetailResponseSchema = z.object({
  userId: z.string(),
  user: z.string(),
  yearMonth: z.string(),
  transactions: z.array(CostDataItemSchema),
  summary: z.object({
    totalAmount: z.number(),
    transactionCount: z.number(),
    categoryBreakdown: z.record(
      PaymentCategorySchema,
      z.array(
        z.object({
          amount: z.number(),
          memo: z.string(),
        }),
      ),
    ),
  }),
});
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;

export const CategorySummaryItemSchema = z.object({
  category: PaymentCategorySchema,
  totalAmount: z.number(),
  transactionCount: z.number(),
  userBreakdown: z.record(z.string(), z.number()),
});
export type CategorySummaryItem = z.infer<typeof CategorySummaryItemSchema>;

export const CategorySummaryResponseSchema = z.object({
  yearMonth: z.string(),
  categories: z.array(CategorySummaryItemSchema),
});
export type CategorySummaryResponse = z.infer<
  typeof CategorySummaryResponseSchema
>;
