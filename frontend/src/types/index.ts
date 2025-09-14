import type { PaymentCategory } from "@shared/types";

// Re-export form types for convenience
export type { LoginFormData, SignUpFormData } from "./forms";
export { LoginFormSchema, SignUpFormSchema } from "./forms";

export type DiffAmount = {
  amount: number;
  from: string;
  to: string;
};

export interface UserSummary {
  userId: string;
  userName: string;
  totalAmount: number;
  transactionCount: number;
  categoryBreakdown: {
    [K in PaymentCategory]: {
      amount: number;
      memo: string;
      timestamp: number;
    }[];
  };
}

export interface DetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserSummary;
}
