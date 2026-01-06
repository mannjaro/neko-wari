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
import { settlementService } from "../settlement/settlementService";

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

    const userSummaries = Array.from(userSummaryMap.values());

    // Auto-create settlement records if there are exactly 2 users
    if (userSummaries.length === 2) {
      await this.autoCreateSettlements(yearMonth, userSummaries);
    }

    return {
      yearMonth,
      totalAmount,
      totalTransactions,
      userSummaries,
    };
  }

  /**
   * Auto-create settlement records for 2-user bill splitting
   */
  private async autoCreateSettlements(
    yearMonth: string,
    userSummaries: UserSummary[],
  ): Promise<void> {
    if (userSummaries.length !== 2) {
      return; // Only support 2-user settlements
    }

    const [user1, user2] = userSummaries;
    const diff = Math.abs(user1.totalAmount - user2.totalAmount) / 2;

    // Determine who pays and who receives
    const payer = user1.totalAmount < user2.totalAmount ? user1 : user2;
    const receiver = user1.totalAmount < user2.totalAmount ? user2 : user1;

    // Check if settlements already exist
    const existingSettlements =
      await settlementService.getMonthlySettlements(yearMonth);

    const payerSettlement = existingSettlements.find(
      (s) => s.UserId === payer.userId,
    );
    const receiverSettlement = existingSettlements.find(
      (s) => s.UserId === receiver.userId,
    );

    // Only create settlement for payer if not exists OR if existing is cancelled
    const shouldCreatePayerSettlement =
      !payerSettlement ||
      (payerSettlement.Status === "cancelled" && diff > 0);

    if (shouldCreatePayerSettlement && diff > 0) {
      try {
        await settlementService.createSettlement({
          userId: payer.userId,
          yearMonth,
          settlementAmount: diff,
          settlementDirection: "pay",
          otherUserId: receiver.userId,
        });
      } catch (error) {
        console.error("Failed to create payer settlement:", error);
      }
    }

    // Only create settlement for receiver if not exists OR if existing is cancelled
    const shouldCreateReceiverSettlement =
      !receiverSettlement ||
      (receiverSettlement.Status === "cancelled" && diff > 0);

    if (shouldCreateReceiverSettlement && diff > 0) {
      try {
        await settlementService.createSettlement({
          userId: receiver.userId,
          yearMonth,
          settlementAmount: diff,
          settlementDirection: "receive",
          otherUserId: payer.userId,
        });
      } catch (error) {
        console.error("Failed to create receiver settlement:", error);
      }
    }
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
