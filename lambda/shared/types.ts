// Shared type definitions for the LINE Bot application

// Payment category type definition
export type PaymentCategory =
  | "rent"
  | "utilities"
  | "furniture"
  | "daily"
  | "transportation"
  | "other";

// User flow step type definition
export type UserStep =
  | "idle"
  | "user_selected"
  | "category_selected"
  | "waiting_memo"
  | "waiting_price"
  | "confirming";

// User state interface for session management
export interface UserState {
  step: UserStep;
  user: string;
  category: PaymentCategory;
  memo: string;
  price: number;
}

// Facet types for DynamoDB single table design
export type FacetType =
  | "USER_STATE"
  | "COST_DATA"
  | "USER_PROFILE"
  | "MONTHLY_SUMMARY";

// Base interface for all DynamoDB items
export interface BaseDynamoItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  EntityType: FacetType;
  CreatedAt: string;
  UpdatedAt: string;
}

// User session state facet
export interface UserStateItem extends BaseDynamoItem {
  EntityType: "USER_STATE";
  PK: string; // USER#{userId}
  SK: "SESSION#CURRENT";
  GSI1PK: "USER_STATES";
  GSI1SK: string; // USER#{userId}#SESSION
  Step: UserStep;
  User?: string;
  Category?: PaymentCategory;
  Memo?: string;
  Price?: number;
  TTL: number;
}

// Cost transaction data facet
export interface CostDataItem extends BaseDynamoItem {
  EntityType: "COST_DATA";
  PK: string; // USER#{userId}
  SK: string; // COST#{timestamp}
  GSI1PK: string; // COST#{YYYY-MM}
  GSI1SK: string; // USER#{userId}#{timestamp}
  User: string;
  Category: PaymentCategory;
  Memo: string;
  Price: number;
  Timestamp: number;
  YearMonth: string; // YYYY-MM for monthly queries
}

// User profile facet
export interface UserProfileItem extends BaseDynamoItem {
  EntityType: "USER_PROFILE";
  PK: string; // USER#{userId}
  SK: "PROFILE#MAIN";
  GSI1PK: "USER_PROFILES";
  GSI1SK: string; // USER#{userId}
  UserId: string;
  DisplayName?: string;
  DefaultCategory?: PaymentCategory;
  TotalSpent: number;
  TransactionCount: number;
  LastActivityAt: string;
}

// Monthly summary facet
export interface MonthlySummaryItem extends BaseDynamoItem {
  EntityType: "MONTHLY_SUMMARY";
  PK: string; // USER#{userId}
  SK: string; // SUMMARY#{YYYY-MM}
  GSI1PK: string; // SUMMARY#{YYYY-MM}
  GSI1SK: string; // USER#{userId}
  UserId: string;
  YearMonth: string; // YYYY-MM
  TotalAmount: number;
  TransactionCount: number;
  CategoryBreakdown: Record<PaymentCategory, number>;
  TopMemos: string[];
}

// Union type for all DynamoDB items
export type DynamoItem =
  | UserStateItem
  | CostDataItem
  | UserProfileItem
  | MonthlySummaryItem;

// LINE Bot specific types
export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
}

export interface WebhookEventContext {
  userId: string;
  replyToken: string;
}

// Dashboard API response types
export interface UserSummary {
  userId: string;
  user: string;
  totalAmount: number;
  transactionCount: number;
  categoryBreakdown: Record<
    PaymentCategory,
    Array<{ amount: number; memo: string }>
  >;
}

export interface MonthlySummaryResponse {
  yearMonth: string;
  totalAmount: number;
  totalTransactions: number;
  userSummaries: UserSummary[];
}

export interface UserDetailResponse {
  userId: string;
  user: string;
  yearMonth: string;
  transactions: CostDataItem[];
  summary: {
    totalAmount: number;
    transactionCount: number;
    categoryBreakdown: Record<
      PaymentCategory,
      Array<{ amount: number; memo: string }>
    >;
  };
}

export interface CategorySummaryItem {
  category: PaymentCategory;
  totalAmount: number;
  transactionCount: number;
  userBreakdown: Record<string, number>;
}

export interface CategorySummaryResponse {
  yearMonth: string;
  categories: CategorySummaryItem[];
}
