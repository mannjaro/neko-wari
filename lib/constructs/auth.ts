import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";

export class Auth extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const pool = new cognito.UserPool(this, "Pool", {});
    pool.addClient("AppClient");
    pool.addDomain("Domain", {
      cognitoDomain: {
        domainPrefix: "payment-dashboard",
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
  }
}
