import type { Context } from "hono";
import type { CreateCostData, UpdateCostData } from "../../shared/types";
import { costService } from "../services/costService";
import { getAuthenticatedUser, getCanonicalUserId, getUserDisplayName } from "../middleware/authMiddleware";
import { userMappingRepository } from "../repositories/userMappingRepository";

export const createCostHandler = async (c: Context, req: CreateCostData) => {
  try {
    // Get authenticated user from context
    const authenticatedUser = getAuthenticatedUser(c);
    if (!authenticatedUser) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Get canonical user ID
    const canonicalUserId = getCanonicalUserId(authenticatedUser);

    // Get or create user mapping
    let userMapping = await userMappingRepository.getUserMappingByCognitoId(canonicalUserId);
    if (!userMapping) {
      // Create new user mapping
      const displayName = req.displayName || getUserDisplayName(authenticatedUser);
      userMapping = {
        cognitoUserId: canonicalUserId,
        displayName: displayName,
        email: authenticatedUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await userMappingRepository.saveUserMapping(userMapping);
    }

    // Create cost data with canonical user ID
    const costData: CreateCostData = {
      ...req,
      userId: canonicalUserId,
    };

    const result = await costService.createCostDetail(costData);
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
