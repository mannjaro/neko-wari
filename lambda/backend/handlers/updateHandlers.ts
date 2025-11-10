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

    // Get canonical user ID (Cognito sub)
    const canonicalUserId = getCanonicalUserId(authenticatedUser);

    // Get or create user mapping
    let userMapping = await userMappingRepository.getUserMappingByCognitoId(canonicalUserId);
    if (!userMapping) {
      // Create new user mapping for Cognito user
      const displayName = req.displayName || getUserDisplayName(authenticatedUser);
      
      // Check if there's an existing LINE user with the same display name that hasn't been linked yet
      const unlinkedLineUsers = await userMappingRepository.findUnlinkedLineUsersByDisplayName(displayName);
      
      if (unlinkedLineUsers.length > 0) {
        // Found a LINE user with same display name that's not yet linked to Cognito
        // Automatically link the first matching LINE user to this Cognito user
        const lineUser = unlinkedLineUsers[0];
        userMapping = {
          cognitoUserId: canonicalUserId,
          lineUserId: lineUser.lineUserId,
          displayName: displayName,
          email: authenticatedUser.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await userMappingRepository.saveUserMapping(userMapping);
        
        // Merge LINE user data by updating their mapping to point to Cognito ID
        await userMappingRepository.mergeLINEUserIntoCognitoUser(
          lineUser.lineUserId!,
          canonicalUserId
        );
      } else {
        // No existing LINE user with matching display name, create fresh Cognito user mapping
        userMapping = {
          cognitoUserId: canonicalUserId,
          displayName: displayName,
          email: authenticatedUser.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await userMappingRepository.saveUserMapping(userMapping);
      }
    }

    // Create cost data with canonical user ID (Cognito sub)
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
