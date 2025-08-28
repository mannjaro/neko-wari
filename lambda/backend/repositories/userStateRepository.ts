import { Logger } from "@aws-lambda-powertools/logger";
import type { UserState, UserStateItem } from "../../shared/types";
import { DYNAMO_KEYS, SESSION_TTL_SECONDS } from "../../shared/constants";
import { dynamoRepository } from "./dynamoRepository";

const logger = new Logger({ serviceName: "userStateRepository" });

/**
 * Repository for user state data operations
 */
export class UserStateRepository {
  /**
   * Retrieves user state from DynamoDB
   */
  async getUserState(userId: string): Promise<UserState | null> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = DYNAMO_KEYS.USER_STATE_SK;
      
      const result = await dynamoRepository.get(pk, sk);

      if (!result) {
        return null;
      }

      // Convert DynamoDB item to UserState interface
      return {
        step: result.Step,
        user: result.User,
        category: result.Category,
        memo: result.Memo,
        price: result.Price,
      };
    } catch (error) {
      logger.error("Error getting user state", { error, userId });
      return null;
    }
  }

  /**
   * Saves user state to DynamoDB with TTL
   */
  async saveUserState(userId: string, state: UserState): Promise<void> {
    try {
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

      const userStateItem: UserStateItem = {
        PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
        SK: DYNAMO_KEYS.USER_STATE_SK,
        GSI1PK: DYNAMO_KEYS.USER_STATES_GSI,
        GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${userId}#${DYNAMO_KEYS.SESSION_PREFIX}`,
        EntityType: DYNAMO_KEYS.ENTITY_USER_STATE as "USER_STATE",
        CreatedAt: now,
        UpdatedAt: now,
        Step: state.step,
        User: state.user,
        Category: state.category,
        Memo: state.memo,
        Price: state.price,
        TTL: ttl,
      };

      await dynamoRepository.put(userStateItem);
    } catch (error) {
      logger.error("Error saving user state", { error, userId, state });
      throw error;
    }
  }

  /**
   * Deletes user state from DynamoDB
   */
  async deleteUserState(userId: string): Promise<void> {
    try {
      const pk = `${DYNAMO_KEYS.USER_PREFIX}${userId}`;
      const sk = DYNAMO_KEYS.USER_STATE_SK;
      
      await dynamoRepository.delete(pk, sk);
    } catch (error) {
      logger.error("Error deleting user state", { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const userStateRepository = new UserStateRepository();