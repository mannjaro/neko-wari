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
  "INVITATION",
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
  GSI1PK: z.string().optional(), // COST#{YYYY-MM}
  GSI1SK: z.string().optional(), // USER#{userId}#{timestamp}
  User: z.string(),
  Category: PaymentCategorySchema,
  Memo: z.string(),
  Price: z.number(),
  Timestamp: z.number(),
  YearMonth: z.string(), // YYYY-MM for monthly queries
});
export type CostDataItem = z.infer<typeof CostDataItemSchema>;

// Create Cost transaction data schema
export const CreateCostDataSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  category: PaymentCategorySchema,
  memo: z.string(),
  price: z.number().gt(0),
});
export type CreateCostData = z.infer<typeof CreateCostDataSchema>;

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
  LineUserId: z.string().optional(), // LINE user ID from OAuth
  LinePictureUrl: z.string().optional(), // LINE profile picture URL
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

// Invitation status enum
export const InvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

// Invitation facet schema
export const InvitationItemSchema = BaseDynamoItemSchema.extend({
  EntityType: z.literal("INVITATION"),
  PK: z.string(), // INVITATION#{invitationId}
  SK: z.literal("INVITATION#MAIN"),
  GSI1PK: z.literal("INVITATIONS"),
  GSI1SK: z.string(), // STATUS#{status}#{createdAt}
  InvitationId: z.string(),
  Token: z.string(), // Unique token for URL
  Status: InvitationStatusSchema,
  CreatedBy: z.string(), // Admin user ID
  AcceptedBy: z.string().optional(), // LINE user ID who accepted
  AcceptedDisplayName: z.string().optional(),
  AcceptedPictureUrl: z.string().optional(),
  AcceptedAt: z.string().optional(),
  ExpiresAt: z.string(), // ISO timestamp
  Metadata: z.record(z.string(), z.unknown()).optional(), // Additional metadata
  TTL: z.number().optional(), // Only set for pending/expired invitations
});
export type InvitationItem = z.infer<typeof InvitationItemSchema>;

// Union schema for all DynamoDB items
export const DynamoItemSchema = z.discriminatedUnion("EntityType", [
  UserStateItemSchema,
  CostDataItemSchema,
  UserProfileItemSchema,
  MonthlySummaryItemSchema,
  InvitationItemSchema,
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
  userName: z.string(),
  totalAmount: z.number(),
  transactionCount: z.number(),
  categoryBreakdown: z.record(
    PaymentCategorySchema,
    z.array(
      z.object({
        amount: z.number(),
        memo: z.string(),
        timestamp: z.number(),
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
  userName: z.string(),
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

// Invitation API schemas
export const CreateInvitationSchema = z.object({
  createdBy: z.string().min(1),
  expirationHours: z.number().min(1).max(168).default(168), // Max 7 days
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;

export const InvitationResponseSchema = z.object({
  invitationId: z.string(),
  token: z.string(),
  invitationUrl: z.string(),
  expiresAt: z.string(),
});
export type InvitationResponse = z.infer<typeof InvitationResponseSchema>;

export const LineLoginCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});
export type LineLoginCallback = z.infer<typeof LineLoginCallbackSchema>;

export const LineUserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  pictureUrl: z.string().optional(),
  statusMessage: z.string().optional(),
});
export type LineUserProfile = z.infer<typeof LineUserProfileSchema>;

export const LineTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  id_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});
export type LineTokenResponse = z.infer<typeof LineTokenResponseSchema>;
