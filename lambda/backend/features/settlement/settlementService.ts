import { Logger } from "@aws-lambda-powertools/logger";
import { DYNAMO_KEYS } from "../../../shared/constants";
import type {
  CompleteSettlement,
  CreateSettlement,
  SettlementStatusItem,
} from "../../../shared/types";
import { type BaseRepository, dynamoClient } from "../../lib/dynamoClient";

const logger = new Logger({ serviceName: "settlementService" });

/**
 * Service for settlement completion management business logic
 */
export class SettlementService {
  private readonly repository: BaseRepository;

  constructor(repository: BaseRepository = dynamoClient) {
    this.repository = repository;
  }

  /**
   * Create or update settlement status for a user and month
   */
  async createSettlement(
    data: CreateSettlement,
  ): Promise<SettlementStatusItem> {
    logger.debug("Creating settlement status", { data });

    try {
      this.validateYearMonth(data.yearMonth);

      const now = new Date().toISOString();

      const settlementItem: SettlementStatusItem = {
        PK: `${DYNAMO_KEYS.USER_PREFIX}${data.userId}`,
        SK: `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${data.yearMonth}`,
        GSI1PK: `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${data.yearMonth}`,
        GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${data.userId}`,
        EntityType: DYNAMO_KEYS.ENTITY_SETTLEMENT_STATUS as "SETTLEMENT_STATUS",
        CreatedAt: now,
        UpdatedAt: now,
        UserId: data.userId,
        YearMonth: data.yearMonth,
        Status: "pending",
        SettlementAmount: data.settlementAmount,
        SettlementDirection: data.settlementDirection,
        OtherUserId: data.otherUserId,
        Notes: data.notes,
      };

      await this.repository.put<SettlementStatusItem>(settlementItem);

      logger.info("Settlement status created successfully", {
        userId: data.userId,
        yearMonth: data.yearMonth,
        amount: data.settlementAmount,
        direction: data.settlementDirection,
      });

      return settlementItem;
    } catch (error) {
      logger.error("Error creating settlement status", { error, data });
      throw error;
    }
  }

  /**
   * Mark settlement as completed
   */
  async completeSettlement(
    data: CompleteSettlement,
  ): Promise<SettlementStatusItem> {
    logger.debug("Completing settlement", { data });

    try {
      this.validateYearMonth(data.yearMonth);

      const pk = `${DYNAMO_KEYS.USER_PREFIX}${data.userId}`;
      const sk = `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${data.yearMonth}`;

      // Get existing settlement
      const existingSettlement =
        await this.repository.get<SettlementStatusItem>(pk, sk);

      if (!existingSettlement) {
        throw new Error(
          `Settlement not found for user ${data.userId} in ${data.yearMonth}`,
        );
      }

      if (existingSettlement.Status === "completed") {
        logger.warn("Settlement already completed", {
          userId: data.userId,
          yearMonth: data.yearMonth,
        });
        return existingSettlement;
      }

      const now = new Date().toISOString();

      // Update to completed status
      const result = await this.repository.update<SettlementStatusItem>(
        pk,
        sk,
        "SET #Status = :status, #CompletedAt = :completedAt, #CompletedBy = :completedBy, #UpdatedAt = :updatedAt, #Notes = :notes",
        {
          "#Status": "Status",
          "#CompletedAt": "CompletedAt",
          "#CompletedBy": "CompletedBy",
          "#UpdatedAt": "UpdatedAt",
          "#Notes": "Notes",
        },
        {
          ":status": "completed",
          ":completedAt": now,
          ":completedBy": data.completedBy,
          ":updatedAt": now,
          ":notes": data.notes || existingSettlement.Notes || "",
        },
      );

      if (!result) {
        throw new Error("Failed to update settlement status");
      }

      logger.info("Settlement completed successfully", {
        userId: data.userId,
        yearMonth: data.yearMonth,
        completedBy: data.completedBy,
      });

      return result as SettlementStatusItem;
    } catch (error) {
      logger.error("Error completing settlement", { error, data });
      throw error;
    }
  }

  /**
   * Cancel/reset settlement completion
   */
  async cancelSettlement(
    userId: string,
    yearMonth: string,
  ): Promise<SettlementStatusItem> {
    logger.debug("Cancelling settlement", { userId, yearMonth });

    try {
      this.validateYearMonth(yearMonth);

      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${yearMonth}`;

      const existingSettlement =
        await this.repository.get<SettlementStatusItem>(pk, sk);

      if (!existingSettlement) {
        throw new Error(
          `Settlement not found for user ${userId} in ${yearMonth}`,
        );
      }

      const now = new Date().toISOString();

      // Update to cancelled status
      const result = await this.repository.update<SettlementStatusItem>(
        pk,
        sk,
        "SET #Status = :status, #UpdatedAt = :updatedAt REMOVE #CompletedAt, #CompletedBy",
        {
          "#Status": "Status",
          "#UpdatedAt": "UpdatedAt",
          "#CompletedAt": "CompletedAt",
          "#CompletedBy": "CompletedBy",
        },
        {
          ":status": "cancelled",
          ":updatedAt": now,
        },
      );

      if (!result) {
        throw new Error("Failed to cancel settlement");
      }

      logger.info("Settlement cancelled successfully", { userId, yearMonth });

      return result as SettlementStatusItem;
    } catch (error) {
      logger.error("Error cancelling settlement", { error, userId, yearMonth });
      throw error;
    }
  }

  /**
   * Get settlement status for a specific user and month
   */
  async getSettlement(
    userId: string,
    yearMonth: string,
  ): Promise<SettlementStatusItem | null> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${yearMonth}`;

      const result = await this.repository.get<SettlementStatusItem>(pk, sk);

      return result || null;
    } catch (error) {
      logger.error("Error getting settlement", { error, userId, yearMonth });
      throw error;
    }
  }

  /**
   * Get all settlements for a specific month (across all users)
   */
  async getMonthlySettlements(
    yearMonth: string,
  ): Promise<SettlementStatusItem[]> {
    try {
      this.validateYearMonth(yearMonth);

      const items = await this.repository.query<SettlementStatusItem>(
        "GSI1",
        "GSI1PK = :gsi1pk",
        {
          ":gsi1pk": `${DYNAMO_KEYS.SETTLEMENT_PREFIX}${yearMonth}`,
        },
      );

      return items;
    } catch (error) {
      logger.error("Error getting monthly settlements", {
        error,
        yearMonth,
      });
      throw error;
    }
  }

  /**
   * Get all settlements for a specific user (across all months)
   */
  async getUserSettlements(userId: string): Promise<SettlementStatusItem[]> {
    try {
      const items = await this.repository.query<SettlementStatusItem>(
        undefined,
        "PK = :pk AND begins_with(SK, :sk)",
        {
          ":pk": `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
          ":sk": DYNAMO_KEYS.SETTLEMENT_PREFIX,
        },
      );

      return items;
    } catch (error) {
      logger.error("Error getting user settlements", { error, userId });
      throw error;
    }
  }

  /**
   * Validate year-month format (YYYY-MM)
   */
  private validateYearMonth(yearMonth: string): void {
    const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!yearMonthRegex.test(yearMonth)) {
      throw new Error(
        `Invalid year-month format: ${yearMonth}. Expected format: YYYY-MM`,
      );
    }
  }
}

// Export singleton instance
export const settlementService = new SettlementService();
