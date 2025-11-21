import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegv2 from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class Backend extends Construct {
  readonly api: apigwv2.IApi;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);
    const db = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      writeCapacity: 1,
      readCapacity: 1,
      timeToLiveAttribute: "TTL", // Updated to match facet pattern
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false,
      },
      deletionProtection: false,
    });
    db.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
      writeCapacity: 1,
      readCapacity: 1,
    });


    // Create a Layer with Powertools for AWS Lambda (TypeScript)
    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      `arn:aws:lambda:${
        cdk.Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:31`
    );

    const fn = new NodejsFunction(this, "Fn", {
      entry: "lambda/backend/handler.ts", // Path to your Lambda function code
      handler: "handler", // The exported function name in your code
      runtime: lambda.Runtime.NODEJS_22_X, // Specify the Node.js runtime version
      memorySize: 256,
      timeout: cdk.Duration.minutes(1), // Set a timeout for the function
      logGroup: new logs.LogGroup(this, "FnLogGroup", {
        retention: logs.RetentionDays.ONE_DAY, // Set log retention policy
      }),
      layers: [powertoolsLayer],
      environment: {
        TABLE_NAME: db.tableName,
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || "",
        LINE_LOGIN_CHANNEL_ID: process.env.LINE_LOGIN_CHANNEL_ID || "",
        LINE_LOGIN_CHANNEL_SECRET: process.env.LINE_LOGIN_CHANNEL_SECRET || "",
      },
      bundling: {
        externalModules: ["@aws-lambda-powertools/*", "@aws-sdk/*"],
      },
    });

    const api = new apigwv2.HttpApi(this, "Api", {
      defaultIntegration: new apigwIntegv2.HttpLambdaIntegration("Integ", fn),
    });

    fn.addEnvironment(
      "LINE_LOGIN_REDIRECT_URI",
      process.env.LINE_LOGIN_REDIRECT_URI ||
        `${api.apiEndpoint}/invitation/callback`,
    );
    fn.addEnvironment(
      "INVITATION_BASE_URL",
      process.env.INVITATION_BASE_URL || api.apiEndpoint,
    );

    const webhookFn = new NodejsFunction(this, "WebhookFn", {
      entry: "lambda/webhook/handler.ts", // Path to your Lambda function code
      handler: "handler", // The exported function name in your code
      runtime: lambda.Runtime.NODEJS_22_X, // Specify the Node.js runtime version
      memorySize: 256,
      timeout: cdk.Duration.minutes(1), // Set a timeout for the function
      logGroup: new logs.LogGroup(this, "WebhookLogGroup", {
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


    const webhookInteg = new apigwIntegv2.HttpLambdaIntegration(
      "WebhookInteg",
      webhookFn
    );

    api.addRoutes({
      path: "/webhook",
      integration: webhookInteg,
    });
    // Grant permissions to Lambda function
    db.grantReadWriteData(fn);
    db.grantReadWriteData(webhookFn);

    this.api = api;
  }
}
