import type { Context } from "hono";
import { costService } from "../services/costService";
import { UpdateCostData } from "../../shared/types";
export const updateCostHandler = async (
  c: Context,
  userId: string,
  timestamp: string,
  req: UpdateCostData
) => {
  try {
    const result = await costService.updateCostDetail(userId, Number(timestamp), req);
    return c.json(result);
  } catch (error) {
    throw error;
  }
};
