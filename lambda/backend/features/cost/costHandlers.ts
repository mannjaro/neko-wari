import type { Context } from "hono";
import type { CreateCostData, UpdateCostData } from "../../../shared/types";
import { costService } from "./costService";

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
  id: string,
  req: UpdateCostData,
) => {
  try {
    const result = await costService.updateCostDetail(userId, id, req);
    return c.json(result);
  } catch (error) {
    throw error;
  }
};

export const deleteCostHandler = async (
  c: Context,
  userId: string,
  id: string,
) => {
  try {
    await costService.deleteCostDetail(userId, id);
    return c.json({ success: true });
  } catch (error) {
    throw error;
  }
};
