import type {
  PaymentCategory,
  SettlementStatus,
  SettlementDirection,
} from "@shared/types";

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

export interface SettlementStatusData {
  userId: string;
  yearMonth: string;
  status: SettlementStatus;
  settlementAmount: number;
  settlementDirection: SettlementDirection;
  otherUserId?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
