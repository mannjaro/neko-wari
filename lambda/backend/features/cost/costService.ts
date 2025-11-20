import { Logger } from "@aws-lambda-powertools/logger";
import * as changeCase from "change-case";
import { DYNAMO_KEYS } from "../../../shared/constants";
import type {
  CostDataItem,
  CreateCostData,
  UpdateCostData,
  UpdateExpressionResult,
  UserState,
} from "../../../shared/types";
import {
  type CostDataItemResponse,
  costDataItemSchema,
} from "../../schemas/responseSchema";
import { dynamoClient } from "../../lib/dynamoClient";

const logger = new Logger({ serviceName: "costService" });

/**
 * Service for cost management business logic
 */
export class CostService {
  /**
   * Create new cost data with business logic validation
   */
  async createCostDetail(data: CreateCostData): Promise<CostDataItemResponse> {
    logger.debug("Creating cost detail", { data });

    try {
      this.validateCreateCostData(data);

      const timestamp = Date.now();
      const now = new Date().toISOString();
      const date = new Date(timestamp);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      const costItem: CostDataItem = {
        PK: `${DYNAMO_KEYS.USER_PREFIX}${data.userId}`,
        SK: `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`,
        GSI1PK: `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
        GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${data.userId}#${timestamp}`,
        EntityType: DYNAMO_KEYS.ENTITY_COST_DATA as "COST_DATA",
        CreatedAt: now,
        UpdatedAt: now,
        User: data.displayName,
        Category: data.category,
        Memo: data.memo,
        Price: data.price,
        Timestamp: timestamp,
        YearMonth: yearMonth,
      };

      await dynamoClient.put<CostDataItem>(costItem);

      logger.info("Cost detail created successfully", {
        userId: data.userId,
        timestamp,
        yearMonth,
        category: data.category,
        price: data.price,
      });

      return costItem;
    } catch (error) {
      logger.error("Error creating cost detail", { error, data });
      throw error;
    }
  }

  /**
   * Saves cost data permanently to DynamoDB (from UserState)
   */
  async saveCostData(userId: string, state: UserState): Promise<void> {
    try {
      const timestamp = Date.now();
      const now = new Date().toISOString();
      const date = new Date(timestamp);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      if (state.user === undefined) {
        throw new Error("user is not provided");
      }
      if (state.category === undefined) {
        throw new Error("category is not provided");
      }

      const costItem: CostDataItem = {
        PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
        SK: `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`,
        GSI1PK: `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
        GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${userId}#${timestamp}`,
        EntityType: DYNAMO_KEYS.ENTITY_COST_DATA as "COST_DATA",
        CreatedAt: now,
        UpdatedAt: now,
        User: state.user,
        Category: state.category,
        Memo: state.memo || "",
        Price: state.price || 0,
        Timestamp: timestamp,
        YearMonth: yearMonth,
      };

      await dynamoClient.put<CostDataItem>(costItem);

      logger.info("Cost data saved successfully", {
        userId,
        timestamp,
        yearMonth,
        user: state.user,
        category: state.category,
        price: state.price,
      });
    } catch (error) {
      logger.error("Error saving cost data", { error, userId, state });
      throw error;
    }
  }

  /**
   * Update existing cost data with business logic validation
   */
  async updateCostDetail(
    userId: string,
    timestamp: number,
    updateData: UpdateCostData,
  ): Promise<CostDataItemResponse> {
    logger.debug("Updating cost detail", { userId, timestamp, updateData });

    try {
      this.validateCostData(updateData);

      const prevCostItem = await this.getCostDataItem(userId, timestamp);
      const updateExpressions = this.buildUpdateExpression(updateData);

      const result = await dynamoClient.update<CostDataItem>(
        prevCostItem.PK,
        prevCostItem.SK,
        updateExpressions.UpdateExpression,
        updateExpressions.ExpressionAttributeNames,
        updateExpressions.ExpressionAttributeValues,
      );

      if (!result) {
        throw new Error("Updated item is null");
      }

      const updatedItem = costDataItemSchema.parse(result);

      logger.info("Cost detail updated successfully", {
        userId,
        timestamp,
        updatedFields: Object.keys(updateData),
      });

      return updatedItem;
    } catch (error) {
      logger.error("Error updating cost detail", { error, userId, timestamp });
      throw error;
    }
  }

  /**
   * Delete cost data
   */
  async deleteCostDetail(userId: string, timestamp: number): Promise<void> {
    logger.debug("Deleting cost detail", { userId, timestamp });

    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`;

      await dynamoClient.delete(pk, sk);

      logger.info("Cost detail deleted successfully", { userId, timestamp });
    } catch (error) {
      logger.error("Error deleting cost detail", { error, userId, timestamp });
      throw error;
    }
  }

  /**
   * Get monthly cost data for dashboard
   */
  async getMonthlyCostData(yearMonth: string): Promise<CostDataItem[]> {
    try {
      const items = await dynamoClient.query<CostDataItem>(
        "GSI1",
        "GSI1PK = :gsi1pk",
        {
          ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
        },
      );

      return items;
    } catch (error) {
      logger.error("Error getting monthly cost data", { error, yearMonth });
      throw error;
    }
  }

  /**
   * Get cost data for specific user and month
   */
  async getUserMonthlyCostData(
    userId: string,
    yearMonth: string,
  ): Promise<CostDataItem[]> {
    try {
      const items = await dynamoClient.query<CostDataItem>(
        "GSI1",
        "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)",
        {
          ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
          ":gsi1sk": `${DYNAMO_KEYS.USER_PREFIX}${userId}#`,
        },
      );

      return items;
    } catch (error) {
      logger.error("Error getting user monthly cost data", {
        error,
        userId,
        yearMonth,
      });
      throw error;
    }
  }

  /**
   * Get single cost data item (Internal use)
   */
  private async getCostDataItem(
    userId: string,
    timestamp: number,
  ): Promise<CostDataItem> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`;

      const result = await dynamoClient.get<CostDataItem>(pk, sk);

      if (!result) {
        throw new Error("Selected item is not exist");
      }

      return result;
    } catch (error) {
      logger.error("Error getting cost data item", {
        error,
        userId,
        timestamp,
      });
      throw error;
    }
  }

  /**
   * Validate cost data before creating
   */
  private validateCreateCostData(data: CreateCostData): void {
    if (data.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (data.memo.length > 500) {
      throw new Error("Memo cannot exceed 500 characters");
    }

    if (!data.userId || data.userId.trim() === "") {
      throw new Error("User ID is required");
    }
  }

  /**
   * Validate cost data before saving
   */
  private validateCostData(updateData: UpdateCostData): void {
    if (updateData.price !== undefined && updateData.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (updateData.memo !== undefined && updateData.memo.length > 500) {
      throw new Error("Memo cannot exceed 500 characters");
    }
  }

  /**
   * Build update expression for DynamoDB UpdateCommand
   */
  private buildUpdateExpression(
    updateData: UpdateCostData,
  ): UpdateExpressionResult {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, string | number> = {};

    Object.entries(updateData).forEach(([_key, value]) => {
      if (value !== undefined && value !== null) {
        const key = changeCase.pascalCase(_key);
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;

        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    if (updateExpressions.length === 0) {
      throw new Error("更新するデータが指定されていません");
    }

    return {
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
  }
}

// Export singleton instance
export const costService = new CostService();
