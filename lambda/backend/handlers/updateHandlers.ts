import type { Context } from "hono";
import { updateCostData } from "../services/dynamodb";
import { UpdateCostData } from "../../shared/types";
export const updateCostHandler = async (
  c: Context,
  userId: string,
  timestamp: string,
  req: UpdateCostData
) => {
  try {
    const result = await updateCostData(userId, Number(timestamp), req);
    return c.json(result);
  } catch (error) {
    throw error;
  }
};
