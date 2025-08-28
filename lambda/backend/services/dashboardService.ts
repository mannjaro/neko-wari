import { Logger } from "@aws-lambda-powertools/logger";
import type {
  PaymentCategory,
  UserSummary,
  MonthlySummaryResponse,
  UserDetailResponse,
  CategorySummaryResponse,
  CategorySummaryItem,
} from "../../shared/types";
import { DYNAMO_KEYS } from "../../shared/constants";
import { costDataRepository } from "../repositories/costDataRepository";

const logger = new Logger({ serviceName: "dashboardService" });

/**
 * Service for dashboard-related business logic
 */
export class DashboardService {
  /**
   * Generate monthly summary from cost data
   */
  async generateMonthlySummary(yearMonth: string): Promise<MonthlySummaryResponse> {
    const costData = await costDataRepository.getMonthlyCostData(yearMonth);

    const userSummaryMap = new Map<string, UserSummary>();
    let totalAmount = 0;
    let totalTransactions = 0;

    for (const item of costData) {
      totalAmount += item.Price;
      totalTransactions++;

      const userId = item.PK.replace(`${DYNAMO_KEYS.USER_PREFIX}`, "");
      const existing = userSummaryMap.get(userId);

      if (existing) {
        existing.totalAmount += item.Price;
        existing.transactionCount++;

        if (existing.categoryBreakdown[item.Category]) {
          existing.categoryBreakdown[item.Category].push({
            amount: item.Price,
            memo: item.Memo || "",
            timestamp: item.Timestamp,
          });
        } else {
          existing.categoryBreakdown[item.Category] = [
            {
              amount: item.Price,
              memo: item.Memo || "",
              timestamp: item.Timestamp,
            },
          ];
        }
      } else {
        const categoryBreakdown = {} as Record<
          PaymentCategory,
          Array<{ amount: number; memo: string; timestamp: number }>
        >;
        categoryBreakdown[item.Category] = [
          {
            amount: item.Price,
            memo: item.Memo || "",
            timestamp: item.Timestamp,
          },
        ];

        userSummaryMap.set(userId, {
          userId,
          user: item.User,
          totalAmount: item.Price,
          transactionCount: 1,
          categoryBreakdown,
        });
      }
    }

    return {
      yearMonth,
      totalAmount,
      totalTransactions,
      userSummaries: Array.from(userSummaryMap.values()),
    };
  }

  /**
   * Get user detail data for dashboard
   */
  async getUserDetailData(
    userId: string,
    yearMonth: string
  ): Promise<UserDetailResponse> {
    const transactions = await costDataRepository.getUserMonthlyCostData(
      userId,
      yearMonth
    );

    if (transactions.length === 0) {
      throw new Error(`No data found for user ${userId} in ${yearMonth}`);
    }

    let totalAmount = 0;
    const categoryBreakdown = {} as Record<
      PaymentCategory,
      Array<{ amount: number; memo: string }>
    >;

    for (const transaction of transactions) {
      totalAmount += transaction.Price;

      if (categoryBreakdown[transaction.Category]) {
        categoryBreakdown[transaction.Category].push({
          amount: transaction.Price,
          memo: transaction.Memo || "",
        });
      } else {
        categoryBreakdown[transaction.Category] = [
          {
            amount: transaction.Price,
            memo: transaction.Memo || "",
          },
        ];
      }
    }

    return {
      userId,
      user: transactions[0].User,
      yearMonth,
      transactions: transactions.sort((a, b) => b.Timestamp - a.Timestamp),
      summary: {
        totalAmount,
        transactionCount: transactions.length,
        categoryBreakdown,
      },
    };
  }

  /**
   * Generate category summary for dashboard
   */
  async generateCategorySummary(yearMonth: string): Promise<CategorySummaryResponse> {
    const costData = await costDataRepository.getMonthlyCostData(yearMonth);

    const categoryMap = new Map<PaymentCategory, CategorySummaryItem>();

    for (const item of costData) {
      const existing = categoryMap.get(item.Category);

      if (existing) {
        existing.totalAmount += item.Price;
        existing.transactionCount++;
        existing.userBreakdown[item.User] =
          (existing.userBreakdown[item.User] || 0) + item.Price;
      } else {
        const userBreakdown = {} as Record<string, number>;
        userBreakdown[item.User] = item.Price;

        categoryMap.set(item.Category, {
          category: item.Category,
          totalAmount: item.Price,
          transactionCount: 1,
          userBreakdown,
        });
      }
    }

    return {
      yearMonth,
      categories: Array.from(categoryMap.values()).sort(
        (a, b) => b.totalAmount - a.totalAmount
      ),
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();