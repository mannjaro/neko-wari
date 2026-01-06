import type { Context } from "hono";
import type {
  CompleteSettlement,
  CreateSettlement,
  SettlementResponse,
} from "../../../shared/types";
import { settlementService } from "./settlementService";

/**
 * Create settlement status for a user and month
 */
export const createSettlementHandler = async (
  c: Context,
  req: CreateSettlement,
) => {
  try {
    const result = await settlementService.createSettlement(req);

    const response: SettlementResponse = {
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    };

    return c.json(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Mark settlement as completed
 */
export const completeSettlementHandler = async (
  c: Context,
  req: CompleteSettlement,
) => {
  try {
    const result = await settlementService.completeSettlement(req);

    const response: SettlementResponse = {
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    };

    return c.json(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel settlement (reset to pending)
 */
export const cancelSettlementHandler = async (
  c: Context,
  userId: string,
  yearMonth: string,
) => {
  try {
    const result = await settlementService.cancelSettlement(userId, yearMonth);

    const response: SettlementResponse = {
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    };

    return c.json(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get settlement status for a user and month
 */
export const getSettlementHandler = async (
  c: Context,
  userId: string,
  yearMonth: string,
) => {
  try {
    const result = await settlementService.getSettlement(userId, yearMonth);

    if (!result) {
      return c.json({ message: "Settlement not found" }, 404);
    }

    const response: SettlementResponse = {
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    };

    return c.json(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all settlements for a specific month
 */
export const getMonthlySettlementsHandler = async (
  c: Context,
  yearMonth: string,
) => {
  try {
    const results = await settlementService.getMonthlySettlements(yearMonth);

    const response: SettlementResponse[] = results.map((result) => ({
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    }));

    return c.json(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all settlements for a specific user
 */
export const getUserSettlementsHandler = async (
  c: Context,
  userId: string,
) => {
  try {
    const results = await settlementService.getUserSettlements(userId);

    const response: SettlementResponse[] = results.map((result) => ({
      userId: result.UserId,
      yearMonth: result.YearMonth,
      status: result.Status,
      settlementAmount: result.SettlementAmount,
      settlementDirection: result.SettlementDirection,
      otherUserId: result.OtherUserId,
      completedAt: result.CompletedAt,
      completedBy: result.CompletedBy,
      notes: result.Notes,
      createdAt: result.CreatedAt,
      updatedAt: result.UpdatedAt,
    }));

    return c.json(response);
  } catch (error) {
    throw error;
  }
};
