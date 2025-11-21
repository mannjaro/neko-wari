import type {
  PaymentCategory,
  UserSummary,
  MonthlySummaryResponse,
  UserDetailResponse,
  CategorySummaryResponse,
  CategorySummaryItem,
  CostDataItem,
} from "../../../shared/types";
import { DYNAMO_KEYS } from "../../../shared/constants";
import { dynamoClient } from "../../lib/dynamoClient";
import { invitationService } from "../invitation/invitationService";

/**
 * Service for dashboard-related business logic
 */
export class DashboardService {
  /**
   * Build mapping from LINE user ID to display name from accepted invitations
   */
  private async getUserIdToDisplayNameMap(): Promise<Map<string, string>> {
    const acceptedInvitations = await invitationService.listInvitations(
      undefined,
      "accepted",
    );
    const userMap = new Map<string, string>();
    for (const invitation of acceptedInvitations) {
      if (invitation.AcceptedBy && invitation.AcceptedDisplayName) {
        userMap.set(invitation.AcceptedBy, invitation.AcceptedDisplayName);
      }
    }
    return userMap;
  }

  /**
   * Generate monthly summary from cost data
   */
  async generateMonthlySummary(
    yearMonth: string,
  ): Promise<MonthlySummaryResponse> {
    const costData = await this.getMonthlyCostData(yearMonth);
    const userDisplayNameMap = await this.getUserIdToDisplayNameMap();

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
      const displayName = userDisplayNameMap.get(userId) || item.User;
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
    yearMonth: string,
  ): Promise<UserDetailResponse> {
    const transactions = await this.getUserMonthlyCostData(userId, yearMonth);
    const userDisplayNameMap = await this.getUserIdToDisplayNameMap();

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

    return {
      userId,
      userName: userDisplayNameMap.get(userId) || transactions[0].User,
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
    yearMonth: string,
  ): Promise<CategorySummaryResponse> {
    const costData = await this.getMonthlyCostData(yearMonth);
    const userDisplayNameMap = await this.getUserIdToDisplayNameMap();

    const categoryMap = new Map<PaymentCategory, CategorySummaryItem>();

    for (const item of costData) {
      const userId = item.PK.replace(`${DYNAMO_KEYS.USER_PREFIX}`, "");
      const displayName = userDisplayNameMap.get(userId) || item.User;
      const existing = categoryMap.get(item.Category);

      if (existing) {
        existing.totalAmount += item.Price;
        existing.transactionCount++;
        existing.userBreakdown[displayName] =
          (existing.userBreakdown[displayName] || 0) + item.Price;
      } else {
        const userBreakdown = {} as Record<string, number>;
        userBreakdown[displayName] = item.Price;

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
        (a, b) => b.totalAmount - a.totalAmount,
      ),
    };
  }

  /**
   * Get monthly cost data (Private helper)
   */
  private async getMonthlyCostData(yearMonth: string): Promise<CostDataItem[]> {
    const items = await dynamoClient.query<CostDataItem>(
      "GSI1",
      "GSI1PK = :gsi1pk",
      {
        ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
      },
    );
    return items;
  }

  /**
   * Get user monthly cost data (Private helper)
   */
  private async getUserMonthlyCostData(
    userId: string,
    yearMonth: string,
  ): Promise<CostDataItem[]> {
    const items = await dynamoClient.query<CostDataItem>(
      "GSI1",
      "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)",
      {
        ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
        ":gsi1sk": `${DYNAMO_KEYS.USER_PREFIX}${userId}#`,
      },
    );
    return items;
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
