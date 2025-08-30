import { PaymentCategorySchema, type PaymentCategory } from "@shared/types";
export type DiffAmount = {
  amount: number;
  from: string;
  to: string;
};

export interface DetailDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    userId: string;
    user: string;
    totalAmount: number;
    transactionCount: number;
    categoryBreakdown: {
      [K in PaymentCategory]: {
        amount: number;
        memo: string;
        timestamp: number;
      }[];
    };
  };
}
