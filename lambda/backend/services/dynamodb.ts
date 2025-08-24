import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

import type {
  UserState,
  CostDataItem,
  UserStateItem,
  PaymentCategory,
  UserSummary,
  MonthlySummaryResponse,
  UserDetailResponse,
  CategorySummaryResponse,
  CategorySummaryItem,
} from "../../shared/types.js";
import { DYNAMO_KEYS, SESSION_TTL_SECONDS } from "../../shared/constants";

const logger = new Logger({ serviceName: "lineBotDynamoDB" });

// DynamoDB client setup
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const TABLE_NAME = process.env.TABLE_NAME || "";

/**
 * Retrieves user state from DynamoDB
 */
export const getUserState = async (
  userId: string
): Promise<UserState | null> => {
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
export const saveUserState = async (
  userId: string,
  state: UserState
): Promise<void> => {
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
export const saveCostData = async (
  userId: string,
  state: UserState
): Promise<void> => {
  try {
    const timestamp = Date.now();
    const now = new Date().toISOString();
    const date = new Date(timestamp);
    const yearMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (state.user === undefined) {
      throw new Error("user is not provided");
    }
    if (state.category === undefined) {
      throw new Error("category is not provided");
    }

    const costItem: CostDataItem = {
      PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
      SK: `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`,
      GSI1PK: `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
      GSI1SK: `${DYNAMO_KEYS.USER_PREFIX}${userId}#${timestamp}`,
      EntityType: DYNAMO_KEYS.ENTITY_COST_DATA as "COST_DATA",
      CreatedAt: now,
      UpdatedAt: now,
      User: state.user,
      Category: state.category,
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

/**
 * Get monthly cost data for dashboard
 */
export const getMonthlyCostData = async (
  yearMonth: string
): Promise<CostDataItem[]> => {
  try {
    const allItems: CostDataItem[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :gsi1pk",
          ExpressionAttributeValues: {
            ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      if (result.Items) {
        allItems.push(...(result.Items as CostDataItem[]));
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  } catch (error) {
    logger.error("Error getting monthly cost data", { error, yearMonth });
    throw error;
  }
};

/**
 * Get cost data for specific user and month
 */
export const getUserMonthlyCostData = async (
  userId: string,
  yearMonth: string
): Promise<CostDataItem[]> => {
  try {
    const allItems: CostDataItem[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression:
            "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)",
          ExpressionAttributeValues: {
            ":gsi1pk": `${DYNAMO_KEYS.COST_PREFIX}${yearMonth}`,
            ":gsi1sk": `${DYNAMO_KEYS.USER_PREFIX}${userId}#`,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      if (result.Items) {
        allItems.push(...(result.Items as CostDataItem[]));
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  } catch (error) {
    logger.error("Error getting user monthly cost data", {
      error,
      userId,
      yearMonth,
    });
    throw error;
  }
};

/**
 * Generate monthly summary from cost data
 */
export const generateMonthlySummary = async (
  yearMonth: string
): Promise<MonthlySummaryResponse> => {
  const costData = await getMonthlyCostData(yearMonth);

  const userSummaryMap = new Map<string, UserSummary>();
  let totalAmount = 0;
  let totalTransactions = 0;

  for (const item of costData) {
    totalAmount += item.Price;
    totalTransactions++;

    const userId = item.PK.replace(`${DYNAMO_KEYS.USER_PREFIX}`, "");
    const existing = userSummaryMap.get(userId);

    if (existing) {
      existing.totalAmount += item.Price;
      existing.transactionCount++;

      if (existing.categoryBreakdown[item.Category]) {
        existing.categoryBreakdown[item.Category].push({
          amount: item.Price,
          memo: item.Memo || "",
        });
      } else {
        existing.categoryBreakdown[item.Category] = [
          {
            amount: item.Price,
            memo: item.Memo || "",
          },
        ];
      }
    } else {
      const categoryBreakdown = {} as Record<
        PaymentCategory,
        Array<{ amount: number; memo: string }>
      >;
      categoryBreakdown[item.Category] = [
        {
          amount: item.Price,
          memo: item.Memo || "",
        },
      ];

      userSummaryMap.set(userId, {
        userId,
        user: item.User,
        totalAmount: item.Price,
        transactionCount: 1,
        categoryBreakdown,
      });
    }
  }

  return {
    yearMonth,
    totalAmount,
    totalTransactions,
    userSummaries: Array.from(userSummaryMap.values()),
  };
};

/**
 * Get user detail data for dashboard
 */
export const getUserDetailData = async (
  userId: string,
  yearMonth: string
): Promise<UserDetailResponse> => {
  const transactions = await getUserMonthlyCostData(userId, yearMonth);

  if (transactions.length === 0) {
    throw new Error(`No data found for user ${userId} in ${yearMonth}`);
  }

  let totalAmount = 0;
  const categoryBreakdown = {} as Record<
    PaymentCategory,
    Array<{ amount: number; memo: string }>
  >;

  for (const transaction of transactions) {
    totalAmount += transaction.Price;

    if (categoryBreakdown[transaction.Category]) {
      categoryBreakdown[transaction.Category].push({
        amount: transaction.Price,
        memo: transaction.Memo || "",
      });
    } else {
      categoryBreakdown[transaction.Category] = [
        {
          amount: transaction.Price,
          memo: transaction.Memo || "",
        },
      ];
    }
  }

  return {
    userId,
    user: transactions[0].User,
    yearMonth,
    transactions: transactions.sort((a, b) => b.Timestamp - a.Timestamp),
    summary: {
      totalAmount,
      transactionCount: transactions.length,
      categoryBreakdown,
    },
  };
};

/**
 * Generate category summary for dashboard
 */
export const generateCategorySummary = async (
  yearMonth: string
): Promise<CategorySummaryResponse> => {
  const costData = await getMonthlyCostData(yearMonth);

  const categoryMap = new Map<PaymentCategory, CategorySummaryItem>();

  for (const item of costData) {
    const existing = categoryMap.get(item.Category);

    if (existing) {
      existing.totalAmount += item.Price;
      existing.transactionCount++;
      existing.userBreakdown[item.User] =
        (existing.userBreakdown[item.User] || 0) + item.Price;
    } else {
      const userBreakdown = {} as Record<string, number>;
      userBreakdown[item.User] = item.Price;

      categoryMap.set(item.Category, {
        category: item.Category,
        totalAmount: item.Price,
        transactionCount: 1,
        userBreakdown,
      });
    }
  }

  return {
    yearMonth,
    categories: Array.from(categoryMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    ),
  };
};

/**
 * Update existing cost data
 */
export const updateCostData = async (
  userId: string,
  timestamp: number,
  state: UserState
): Promise<void> => {
  const prevCostItem = await (async () => {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `${DYNAMO_KEYS.USER_PREFIX}${userId}`,
            SK: `${DYNAMO_KEYS.COST_PREFIX}${timestamp}`,
          },
        })
      );
      if (!result.Item) {
        throw new Error("Selected item is not exist");
      }
      const item: CostDataItem = {
        PK: result.Item.PK,
        SK: result.Item.SK,
        GSI1PK: result.Item.GSI1PK,
        GSI1SK: result.Item.GSI1SK,
        Category: result.Item.Category,
        CreatedAt: result.Item.CreatedAt,
        EntityType: result.Item.EntityType,
        Memo: result.Item.Memo,
        Price: result.Item.Price,
        Timestamp: result.Item.Timestamp,
        UpdatedAt: result.Item.UpdatedAt,
        User: result.Item.User,
        YearMonth: result.Item.YearMonth,
      };
      return item;
    } catch (error) {
      logger.error("Error getting cost detail", { error, userId, timestamp });
      throw error;
    }
  })();

  const now = new Date().toISOString();
  const costItem: CostDataItem = {
    PK: prevCostItem.PK,
    SK: prevCostItem.SK,
    GSI1PK: prevCostItem.GSI1PK,
    GSI1SK: prevCostItem.GSI1SK,
    EntityType: prevCostItem.EntityType,
    CreatedAt: prevCostItem.CreatedAt,
    UpdatedAt: now,
    User: state.user,
    Category: state.category,
    Memo: state.memo || "",
    Price: state.price || 0,
    Timestamp: timestamp,
    YearMonth: prevCostItem.YearMonth,
  };

  try {
    docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: costItem,
      })
    );
  } catch (error) {
    logger.error("Error getting cost detail", { error, userId, timestamp });
    throw error;
  }
};
