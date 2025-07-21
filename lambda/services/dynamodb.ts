import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

import type { UserState, CostDataItem, UserStateItem } from "../types.js";
import { DYNAMO_KEYS, SESSION_TTL_SECONDS } from "../constants.js";

const logger = new Logger({ serviceName: "lineBotDynamoDB" });

// DynamoDB client setup
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const TABLE_NAME = process.env.TABLE_NAME || "";

/**
 * Retrieves user state from DynamoDB
 */
export const getUserState = async (userId: string): Promise<UserState | null> => {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
          SK: DYNAMO_KEYS.USER_STATE_SK,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    // Convert DynamoDB item to UserState interface
    return {
      step: result.Item.Step,
      user: result.Item.User,
      category: result.Item.Category,
      memo: result.Item.Memo,
      price: result.Item.Price,
    };
  } catch (error) {
    logger.error("Error getting user state", { error, userId });
    return null;
  }
};

/**
 * Saves user state to DynamoDB with TTL
 */
export const saveUserState = async (userId: string, state: UserState): Promise<void> => {
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

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: userStateItem,
      })
    );
  } catch (error) {
    logger.error("Error saving user state", { error, userId, state });
    throw error;
  }
};

/**
 * Deletes user state from DynamoDB
 */
export const deleteUserState = async (userId: string): Promise<void> => {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
          SK: DYNAMO_KEYS.USER_STATE_SK,
        },
      })
    );
  } catch (error) {
    logger.error("Error deleting user state", { error, userId });
    throw error;
  }
};

/**
 * Saves cost data permanently to DynamoDB
 */
export const saveCostData = async (userId: string, state: UserState): Promise<void> => {
  try {
    const timestamp = Date.now();
    const now = new Date().toISOString();
    const date = new Date(timestamp);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const costItem: CostDataItem = {
      PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
      SK: `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`,
      GSI1PK: `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
      GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${userId}#${timestamp}`,
      EntityType: DYNAMO_KEYS.ENTITY_COST_DATA as "COST_DATA",
      CreatedAt: now,
      UpdatedAt: now,
      User: state.user!,
      Category: state.category!,
      Memo: state.memo || "",
      Price: state.price || 0,
      Timestamp: timestamp,
      YearMonth: yearMonth,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: costItem,
      })
    );

    logger.info("Cost data saved successfully", {
      userId,
      timestamp,
      yearMonth,
      user: state.user,
      category: state.category,
      price: state.price,
    });
  } catch (error) {
    logger.error("Error saving cost data", { error, userId, state });
    throw error;
  }
};