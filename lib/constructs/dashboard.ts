import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { NodejsBuild } from "deploy-time-build";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class DashboardUi extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const destinationBucket = new s3.Bucket(this, "FrontendAsset");

    const distribution = new cloudfront.Distribution(this, "FrontendDist", {
      defaultBehavior: {
        origin:
          origins.S3BucketOrigin.withOriginAccessControl(destinationBucket),
      },
    });
    new NodejsBuild(this, "Dashboard", {
      assets: [
        {
          path: "dashboard-ui",
          exclude: ["dist", "node_modules"],
        },
      ],
      destinationBucket,
      distribution,
      outputSourceDirectory: "dist",
      buildCommands: ["npm ci", "npm run build"],
    });
  }
}
