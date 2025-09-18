import { Logger } from "@aws-lambda-powertools/logger";
import type { UpdateCostData } from "../../shared/types";
import type { CostDataItemResponse } from "../schemas/responseSchema";
import { costDataRepository } from "../repositories/costDataRepository";

const logger = new Logger({ serviceName: "costService" });

/**
 * Service for cost management business logic
 */
export class CostService {
  /**
   * Update existing cost data with business logic validation
   */
  async updateCostDetail(
    userId: string,
    timestamp: number,
    updateData: UpdateCostData
  ): Promise<CostDataItemResponse> {
    logger.debug("Updating cost detail", { userId, timestamp, updateData });

    // Business logic validation could be added here
    // For example: validate price ranges, category constraints, etc.

    try {
      this.validateCostData(updateData);

      const updatedItem = await costDataRepository.updateCostData(
        userId,
        timestamp,
        updateData
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