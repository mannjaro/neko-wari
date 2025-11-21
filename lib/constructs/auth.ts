import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface AuthProps extends cdk.StackProps {
  table: dynamodb.ITable;
}

export class Auth extends Construct {
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    const authChallengeFn = new NodejsFunction(this, 'authChallengeFn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: 'lambda/cognito/postAuthentication.ts',
      environment: {
        TABLE_NAME: props.table.tableName,
      },
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
    });

    // Grant read access to query invitations
    props.table.grantReadData(authChallengeFn);

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
