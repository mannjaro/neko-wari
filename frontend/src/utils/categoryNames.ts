import type { PaymentCategory } from "@/types/shared";

// Category display names mapping
export const CATEGORY_NAMES: Record<PaymentCategory, string> = {
  rent: "家賃",
  utilities: "光熱費など",
  furniture: "家具/家電",
  daily: "日用品/食品",
  transportation: "交通費",
  other: "その他",
};

export function getCategoryName(category: PaymentCategory): string {
  return CATEGORY_NAMES[category] || category;
}
