import * as cdk from "aws-cdk-lib";
import { Auth } from "./constructs/auth";
import { Backend } from "./constructs/backend";

import { Construct } from "constructs";

export class LineBotSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.RemovalPolicies.of(this).destroy();

    const auth = new Auth(this, "Auth");
    const backend = new Backend(this, "Backend");
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: backend.api.apiEndpoint ?? "",
    });
  }
}
