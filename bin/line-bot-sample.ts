#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LineBotSampleStack } from "../lib/line-bot-sample-stack";

const app = new cdk.App();
new LineBotSampleStack(app, "LineBotStack");
