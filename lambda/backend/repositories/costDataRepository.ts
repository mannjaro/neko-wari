import { Logger } from "@aws-lambda-powertools/logger";
import * as changeCase from "change-case";
import { DYNAMO_KEYS } from "../../shared/constants";
import type {
  CostDataItem,
  CreateCostData,
  UpdateCostData,
  UpdateExpressionResult,
  UserState,
} from "../../shared/types";
import {
  type CostDataItemResponse,
  costDataItemSchema,
} from "../schemas/responseSchema";
import { dynamoRepository } from "./dynamoRepository";

const logger = new Logger({ serviceName: "costDataRepository" });

/**
 * Repository for cost data operations
 */
export class CostDataRepository {
  /**
   * Creates new cost data from API
   */
  async createCostData(data: CreateCostData): Promise<CostDataItem> {
    try {
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
        User: data.userId,
        Category: data.category,
        Memo: data.memo,
        Price: data.price,
        Timestamp: timestamp,
        YearMonth: yearMonth,
      } as CostDataItem;

      await dynamoRepository.put(costItem);

      logger.info("Cost data created successfully", {
        userId: data.userId,
        timestamp,
        yearMonth,
        category: data.category,
        price: data.price,
      });

      return costItem;
    } catch (error) {
      logger.error("Error creating cost data", { error, data });
      throw error;
    }
  }

  /**
   * Saves cost data permanently to DynamoDB
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
      } as CostDataItem;

      await dynamoRepository.put(costItem);

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
   * Get monthly cost data for dashboard
   */
  async getMonthlyCostData(yearMonth: string): Promise<CostDataItem[]> {
    try {
      const items = await dynamoRepository.query("GSI1", "GSI1PK = :gsi1pk", {
        ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
      });

      return items as CostDataItem[];
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
      const items = await dynamoRepository.query(
        "GSI1",
        "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)",
        {
          ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
          ":gsi1sk": `${DYNAMO_KEYS.USER_PREFIX}${userId}#`,
        },
      );

      return items as CostDataItem[];
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
   * Get single cost data item
   */
  async getCostDataItem(
    userId: string,
    timestamp: number,
  ): Promise<CostDataItem> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`;

      const result = await dynamoRepository.get(pk, sk);

      if (!result) {
        throw new Error("Selected item is not exist");
      }

      const item: CostDataItem = {
        PK: result.PK,
        SK: result.SK,
        GSI1PK: result.GSI1PK,
        GSI1SK: result.GSI1SK,
        Category: result.Category,
        CreatedAt: result.CreatedAt,
        EntityType: result.EntityType,
        Memo: result.Memo,
        Price: result.Price,
        Timestamp: result.Timestamp,
        UpdatedAt: result.UpdatedAt,
        User: result.User,
        YearMonth: result.YearMonth,
      };

      return item;
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
   * Update existing cost data
   */
  async updateCostData(
    userId: string,
    timestamp: number,
    updateData: UpdateCostData,
  ): Promise<CostDataItemResponse> {
    try {
      const prevCostItem = await this.getCostDataItem(userId, timestamp);
      const updateExpressions = this.buildUpdateExpression(updateData);

      const result = await dynamoRepository.update(
        prevCostItem.PK,
        prevCostItem.SK,
        updateExpressions.UpdateExpression,
        updateExpressions.ExpressionAttributeNames,
        updateExpressions.ExpressionAttributeValues,
      );

      if (!result) {
        throw new Error("Updated item is null");
      }

      return costDataItemSchema.parse(result);
    } catch (error) {
      logger.error("Error updating cost data", { error, userId, timestamp });
      throw error;
    }
  }

  /**
   * Delete cost data
   */
  async deleteCostData(userId: string, timestamp: number): Promise<void> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`;

      await dynamoRepository.delete(pk, sk);

      logger.info("Cost data deleted successfully", { userId, timestamp });
    } catch (error) {
      logger.error("Error deleting cost data", { error, userId, timestamp });
      throw error;
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

    // 各フィールドをチェックして、値が存在する場合のみ更新対象に追加
    Object.entries(updateData).forEach(([_key, value]) => {
      if (value !== undefined && value !== null) {
        const key = changeCase.pascalCase(_key);
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;

        // SET句に追加
        updateExpressions.push(`${attributeName} = ${attributeValue}`);

        // ExpressionAttributeNames に追加
        expressionAttributeNames[attributeName] = key;

        // ExpressionAttributeValues に追加
        expressionAttributeValues[attributeValue] = value;
      }
    });

    // UpdateExpressionが空の場合はエラー
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
export const costDataRepository = new CostDataRepository();
