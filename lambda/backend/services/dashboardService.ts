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
import { userMappingRepository } from "../repositories/userMappingRepository";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "dashboardService" });

/**
 * Service for dashboard-related business logic
 */
export class DashboardService {
  /**
   * Helper to get display name for a user ID
   * Falls back to the User field from cost data if mapping not found
   */
  private async getDisplayName(userId: string, fallbackName?: string): Promise<string> {
    try {
      const mapping = await userMappingRepository.getUserMappingByCognitoId(userId);
      if (mapping) {
        return mapping.displayName;
      }
    } catch (error) {
      logger.warn("Failed to get user mapping, using fallback", { userId, error });
    }
    return fallbackName || userId;
  }
  /**
   * Generate monthly summary from cost data
   */
  async generateMonthlySummary(
    yearMonth: string
  ): Promise<MonthlySummaryResponse> {
    const costData = await costDataRepository.getMonthlyCostData(yearMonth);

    const userSummaryMap = new Map<string, UserSummary>();
    let totalAmount = 0;
    let totalTransactions = 0;

    // Helper function to create empty category breakdown
    const createEmptyCategoryBreakdown = (): Record<
      PaymentCategory,
      Array<{ amount: number; memo: string; timestamp: number }>
    > => ({
      rent: [],
      utilities: [],
      furniture: [],
      daily: [],
      transportation: [],
      other: [],
    });

    for (const item of costData) {
      totalAmount += item.Price;
      totalTransactions++;

      const userId = item.PK.replace(`${DYNAMO_KEYS.USER_PREFIX}`, "");
      const existing = userSummaryMap.get(userId);

      if (existing) {
        existing.totalAmount += item.Price;
        existing.transactionCount++;

        existing.categoryBreakdown[item.Category].push({
          amount: item.Price,
          memo: item.Memo || "",
          timestamp: item.Timestamp,
        });
      } else {
        const categoryBreakdown = createEmptyCategoryBreakdown();
        categoryBreakdown[item.Category] = [
          {
            amount: item.Price,
            memo: item.Memo || "",
            timestamp: item.Timestamp,
          },
        ];

        // Get display name from user mapping
        const displayName = await this.getDisplayName(userId, item.User);

        userSummaryMap.set(userId, {
          userId,
          userName: displayName,
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
    const categoryBreakdown: Record<
      PaymentCategory,
      Array<{ amount: number; memo: string }>
    > = {
      rent: [],
      utilities: [],
      furniture: [],
      daily: [],
      transportation: [],
      other: [],
    };

    for (const transaction of transactions) {
      totalAmount += transaction.Price;

      categoryBreakdown[transaction.Category].push({
        amount: transaction.Price,
        memo: transaction.Memo || "",
      });
    }

    // Get display name from user mapping
    const displayName = await this.getDisplayName(userId, transactions[0].User);

    return {
      userId,
      userName: displayName,
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
  async generateCategorySummary(
    yearMonth: string
  ): Promise<CategorySummaryResponse> {
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
