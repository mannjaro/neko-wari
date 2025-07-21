import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import { Construct } from "constructs";

export class LineBotSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      layers: [powertoolsLayer],
      environment: {
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || "",
      },
      bundling: {
        externalModules: ["@aws-lambda-powertools/*", "@aws-sdk/*"],
      },
    });

    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // No authentication for the function URL
    });

    new apigw.LambdaRestApi(this, "LineBotApi", {
      handler: fn,
    });
  }
}
