import type { PaymentCategory } from "./types";

// Category display names mapping
export const CATEGORY_NAMES: Record<PaymentCategory, string> = {
  rent: "家賃",
  utilities: "光熱費など",
  furniture: "家具/家電",
  daily: "日用品/食品",
  other: "その他",
};

// Category images mapping
export const CATEGORY_IMAGES: Record<PaymentCategory, string> = {
  rent: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&h=200&fit=crop",
  utilities:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop",
  furniture:
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
  daily:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop",
  other:
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&h=200&fit=crop",
};

// Category descriptions mapping
export const CATEGORY_DESCRIPTIONS: Record<PaymentCategory, string> = {
  rent: "住居費・家賃の支払い",
  utilities: "電気・ガス・水道代",
  furniture: "家具・家電製品",
  daily: "食材・生活用品",
  other: "その他の支払い",
};

// Bot response messages
export const BOT_MESSAGES = {
  START: "支払い情報を選択してください",
  MEMO_SAVED: "📝 備考を保存しました。\n\n💰 金額を入力してください。",
  PRICE_ERROR: "正しい金額を入力してください（数字のみ）",
  FLOW_ERROR:
    "❌ 現在の操作を完了するか、「入力を始める」と入力して最初からやり直してください。",
  INVALID_OPERATION:
    "❌ 不正な操作です。「入力を始める」と入力して最初からやり直してください。",
  OPERATION_CANCELLED:
    "❌ 操作をキャンセルしました。\n\n💡 再度開始するには「入力を始める」と入力してください。",
  SESSION_CANCELLED:
    "❌ セッションを終了しました。\n\n💡 新しく開始するには「入力を始める」と入力してください。",
  REGISTRATION_CANCELLED:
    "❌ 登録をキャンセルしました。\n\n💡 再度登録するには「入力を始める」と入力してください。",
  SAVE_ERROR:
    "❌ 登録中にエラーが発生しました。もう一度お試しください。\n\n💡 「入力を始める」と入力して最初からやり直してください。",
  START_HINT: "💡 支払い情報を入力するには「入力を始める」と入力してください。",
  UNKNOWN_SELECTION:
    "❌ 不明な選択です。「入力を始める」と入力して最初からやり直してください。",
  NEW_ENTRY_HINT:
    "\n\n💡 新しい支払いを登録するには「入力を始める」と入力してください。",
} as const;

// Postback data constants
export const POSTBACK_DATA = {
  CANCEL: "payment_user=cancel",
  CONFIRM_YES: "confirm=yes",
  CONFIRM_NO: "confirm=no",
} as const;

// DynamoDB constants
export const DYNAMO_KEYS = {
  // Facet prefixes
  USER_PREFIX: "USER#",
  COST_PREFIX: "COST#",
  PROFILE_PREFIX: "PROFILE#",
  SUMMARY_PREFIX: "SUMMARY#",
  SESSION_PREFIX: "SESSION#",

  // Sort key patterns
  USER_STATE_SK: "SESSION#CURRENT",
  PROFILE_SK: "PROFILE#MAIN",

  // GSI patterns
  USER_STATES_GSI: "USER_STATES",
  USER_PROFILES_GSI: "USER_PROFILES",

  // Entity types
  ENTITY_USER_STATE: "USER_STATE",
  ENTITY_COST_DATA: "COST_DATA",
  ENTITY_USER_PROFILE: "USER_PROFILE",
  ENTITY_MONTHLY_SUMMARY: "MONTHLY_SUMMARY",
} as const;

// Session TTL in seconds (24 hours)
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

// Quick reply options for memo input
export const MEMO_QUICK_REPLIES = [
  "なし",
  "電気代",
  "ガス代",
  "水道代",
  "食費",
  "日用品",
  "交通費",
  "医療費",
  "娯楽費",
  "その他",
] as const;
