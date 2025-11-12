import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"

export class Auth extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const authChallengeFn = new NodejsFunction(this, 'authChallengeFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: 'lambda/cognito/postAuthentication.ts',
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
    });

    const pool = new cognito.UserPool(this, "Pool", {
      signInCaseSensitive: false,
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true,
          emailOtp: true,
          passkey: true,
        },
      },
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
        },
      },
      autoVerify: {
        email: true,
      },
      passkeyUserVerification: cognito.PasskeyUserVerification.REQUIRED,
      lambdaTriggers: {
        postAuthentication: authChallengeFn
      }
    });
    pool.addClient("AppClient", {
      authFlows: {
        user: true,
      },
    });
    pool.addDomain("Domain", {
      cognitoDomain: {
        domainPrefix: "payment-dashboard",
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
  }
}
