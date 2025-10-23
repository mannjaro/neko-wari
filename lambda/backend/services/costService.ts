import { Logger } from "@aws-lambda-powertools/logger";
import type { CreateCostData, UpdateCostData } from "../../shared/types";
import { costDataRepository } from "../repositories/costDataRepository";
import type { CostDataItemResponse } from "../schemas/responseSchema";

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

      const createdItem = await costDataRepository.createCostData(data);

      logger.info("Cost detail created successfully", {
        userId: data.userId,
        category: data.category,
        price: data.price,
      });

      return createdItem;
    } catch (error) {
      logger.error("Error creating cost detail", { error, data });
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

    // Business logic validation could be added here
    // For example: validate price ranges, category constraints, etc.

    try {
      this.validateCostData(updateData);

      const updatedItem = await costDataRepository.updateCostData(
        userId,
        timestamp,
        updateData,
      );

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
      await costDataRepository.deleteCostData(userId, timestamp);

      logger.info("Cost detail deleted successfully", { userId, timestamp });
    } catch (error) {
      logger.error("Error deleting cost detail", { error, userId, timestamp });
      throw error;
    }
  }

  /**
   * Validate cost data before creating
   */
  validateCreateCostData(data: CreateCostData): void {
    // Business validation rules
    if (data.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (data.memo.length > 500) {
      throw new Error("Memo cannot exceed 500 characters");
    }

    if (!data.userId || data.userId.trim() === "") {
      throw new Error("User ID is required");
    }

    // Add more validation rules as needed
  }

  /**
   * Validate cost data before saving
   */
  validateCostData(updateData: UpdateCostData): void {
    // Business validation rules
    if (updateData.price !== undefined && updateData.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (updateData.memo !== undefined && updateData.memo.length > 500) {
      throw new Error("Memo cannot exceed 500 characters");
    }

    // Add more validation rules as needed
  }
}

// Export singleton instance
export const costService = new CostService();
