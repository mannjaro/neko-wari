import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "dynamoRepository" });

// DynamoDB client setup
export const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
export const TABLE_NAME =
  process.env.TABLE_NAME || "LineBotStack-BackendTable11108670-E0MIZ2H6G0AW";

// Base repository interface for common DynamoDB operations
export interface BaseRepository {
  get(pk: string, sk: string): Promise<any>;
  put(item: any): Promise<void>;
  update(
    pk: string,
    sk: string,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<any>;
  delete(pk: string, sk: string): Promise<void>;
  query(
    indexName: string | undefined,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>
  ): Promise<any[]>;
}

// Base DynamoDB repository implementation
export class DynamoRepository implements BaseRepository {
  async get(pk: string, sk: string): Promise<any> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
        })
      );
      return result.Item || null;
    } catch (error) {
      logger.error("Error in DynamoDB get operation", { error, pk, sk });
      throw error;
    }
  }

  async put(item: any): Promise<void> {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );
    } catch (error) {
      logger.error("Error in DynamoDB put operation", { error, item });
      throw error;
    }
  }

  async update(
    pk: string,
    sk: string,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<any> {
    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes;
    } catch (error) {
      logger.error("Error in DynamoDB update operation", { error, pk, sk });
      throw error;
    }
  }

  async delete(pk: string, sk: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
        })
      );
    } catch (error) {
      logger.error("Error in DynamoDB delete operation", { error, pk, sk });
      throw error;
    }
  }

  async query(
    indexName: string | undefined,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>
  ): Promise<any[]> {
    try {
      const allItems: any[] = [];
      let lastEvaluatedKey: Record<string, any> | undefined;

      do {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: indexName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ExclusiveStartKey: lastEvaluatedKey,
          })
        );

        if (result.Items) {
          allItems.push(...result.Items);
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return allItems;
    } catch (error) {
      logger.error("Error in DynamoDB query operation", {
        error,
        indexName,
        keyConditionExpression,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const dynamoRepository = new DynamoRepository();