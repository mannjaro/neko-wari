import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import { Construct } from "constructs";

export class LineBotSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.RemovalPolicies.of(this).destroy();

    const db = new dynamodb.Table(this, "LineBotTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "TTL", // Updated to match facet pattern
      pointInTimeRecovery: false,
      deletionProtection: false,
    });
    db.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create a Layer with Powertools for AWS Lambda (TypeScript)
    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      `arn:aws:lambda:${
        cdk.Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:31`
    );

    const fn = new NodejsFunction(this, "LineBotHandler", {
      entry: "lambda/handler.ts", // Path to your Lambda function code
      handler: "handler", // The exported function name in your code
      runtime: lambda.Runtime.NODEJS_22_X, // Specify the Node.js runtime version
      memorySize: 512,
      timeout: cdk.Duration.minutes(1), // Set a timeout for the function
      logGroup: new logs.LogGroup(this, "LineBotLogGroup", {
        retention: logs.RetentionDays.ONE_DAY, // Set log retention policy
      }),
      layers: [powertoolsLayer],
      environment: {
        TABLE_NAME: db.tableName,
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || "",
      },
      bundling: {
        externalModules: ["@aws-lambda-powertools/*", "@aws-sdk/*"],
      },
    });

    const api = new apigw.LambdaRestApi(this, "LineBotApi", {
      handler: fn,
      description: "LINE Bot API with faceted DynamoDB backend",
      deployOptions: {
        stageName: "prod",
      },
    });

    // Grant permissions to Lambda function
    db.grantReadWriteData(fn);
  }
}
