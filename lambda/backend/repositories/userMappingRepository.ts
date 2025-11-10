import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "userMappingRepository" });

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "";

export interface UserMapping {
  cognitoUserId: string; // Primary canonical user ID from Cognito (sub)
  lineUserId?: string; // Optional LINE user ID
  displayName: string; // User's display name (email or chosen name)
  email?: string; // User's email from Cognito
  createdAt: string;
  updatedAt: string;
}

/**
 * User Mapping Repository - Manages mappings between external IDs and canonical user IDs
 * 
 * DynamoDB Schema:
 * PK: USER_MAPPING#{cognitoUserId}
 * SK: PROFILE#MAIN
 * GSI1PK: LINE_USER#{lineUserId}
 * GSI1SK: USER_MAPPING
 */
class UserMappingRepository {
  /**
   * Get user mapping by Cognito user ID (canonical ID)
   */
  async getUserMappingByCognitoId(
    cognitoUserId: string
  ): Promise<UserMapping | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER_MAPPING#${cognitoUserId}`,
            SK: "PROFILE#MAIN",
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return {
        cognitoUserId: result.Item.CognitoUserId,
        lineUserId: result.Item.LineUserId,
        displayName: result.Item.DisplayName,
        email: result.Item.Email,
        createdAt: result.Item.CreatedAt,
        updatedAt: result.Item.UpdatedAt,
      };
    } catch (error) {
      logger.error("Error getting user mapping by Cognito ID", {
        cognitoUserId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get user mapping by LINE user ID
   */
  async getUserMappingByLineId(lineUserId: string): Promise<UserMapping | null> {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk",
          ExpressionAttributeValues: {
            ":gsi1pk": `LINE_USER#${lineUserId}`,
            ":gsi1sk": "USER_MAPPING",
          },
          Limit: 1,
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const item = result.Items[0];
      return {
        cognitoUserId: item.CognitoUserId,
        lineUserId: item.LineUserId,
        displayName: item.DisplayName,
        email: item.Email,
        createdAt: item.CreatedAt,
        updatedAt: item.UpdatedAt,
      };
    } catch (error) {
      logger.error("Error getting user mapping by LINE ID", {
        lineUserId,
        error,
      });
      throw error;
    }
  }

  /**
   * Create or update user mapping
   */
  async saveUserMapping(mapping: UserMapping): Promise<void> {
    try {
      const now = new Date().toISOString();

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER_MAPPING#${mapping.cognitoUserId}`,
            SK: "PROFILE#MAIN",
            GSI1PK: mapping.lineUserId
              ? `LINE_USER#${mapping.lineUserId}`
              : undefined,
            GSI1SK: mapping.lineUserId ? "USER_MAPPING" : undefined,
            EntityType: "USER_MAPPING",
            CognitoUserId: mapping.cognitoUserId,
            LineUserId: mapping.lineUserId,
            DisplayName: mapping.displayName,
            Email: mapping.email,
            CreatedAt: mapping.createdAt || now,
            UpdatedAt: now,
          },
        })
      );

      logger.info("User mapping saved successfully", {
        cognitoUserId: mapping.cognitoUserId,
        lineUserId: mapping.lineUserId,
      });
    } catch (error) {
      logger.error("Error saving user mapping", { mapping, error });
      throw error;
    }
  }

  /**
   * Link LINE user ID to existing Cognito user
   */
  async linkLineUser(
    cognitoUserId: string,
    lineUserId: string
  ): Promise<void> {
    try {
      // Get existing mapping
      const existingMapping = await this.getUserMappingByCognitoId(
        cognitoUserId
      );

      if (!existingMapping) {
        throw new Error(
          `User mapping not found for Cognito user ID: ${cognitoUserId}`
        );
      }

      // Update with LINE user ID
      await this.saveUserMapping({
        ...existingMapping,
        lineUserId,
      });

      logger.info("LINE user linked successfully", {
        cognitoUserId,
        lineUserId,
      });
    } catch (error) {
      logger.error("Error linking LINE user", {
        cognitoUserId,
        lineUserId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get canonical user ID from any identifier (Cognito or LINE)
   * This is the main function to resolve user identities
   */
  async getCanonicalUserId(userId: string): Promise<string> {
    // First, try as Cognito user ID (UUID format)
    if (this.isCognitoUserId(userId)) {
      return userId;
    }

    // Try as LINE user ID
    const mapping = await this.getUserMappingByLineId(userId);
    if (mapping) {
      return mapping.cognitoUserId;
    }

    // If not found, return the original ID (for backward compatibility)
    logger.warn("User mapping not found, using original ID", { userId });
    return userId;
  }

  /**
   * Helper to check if an ID looks like a Cognito user ID (UUID)
   */
  private isCognitoUserId(userId: string): boolean {
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
  }
}

export const userMappingRepository = new UserMappingRepository();
