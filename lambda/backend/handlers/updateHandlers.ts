import type { Context } from "hono";
import type { CreateCostData, UpdateCostData } from "../../shared/types";
import { costService } from "../services/costService";

export const createCostHandler = async (c: Context, req: CreateCostData) => {
  try {
    const result = await costService.createCostDetail(req);
    return c.json(result);
  } catch (error) {
    throw error;
  }
};

export const updateCostHandler = async (
  c: Context,
  userId: string,
  timestamp: string,
  req: UpdateCostData,
) => {
  try {
    const result = await costService.updateCostDetail(
      userId,
      Number(timestamp),
      req,
    );
    return c.json(result);
  } catch (error) {
    throw error;
  }
};

export const deleteCostHandler = async (
  c: Context,
  userId: string,
  timestamp: string,
) => {
  try {
    await costService.deleteCostDetail(userId, Number(timestamp));
    return c.json({ success: true });
  } catch (error) {
    throw error;
  }
};
