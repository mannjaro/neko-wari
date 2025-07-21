# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LINE Bot sample application built with AWS CDK, Lambda, and Hono framework. The bot processes LINE webhook events and responds to text messages.

**Architecture**: 
- **Frontend**: LINE Messaging API webhook
- **Backend**: AWS Lambda function with Hono web framework
- **Infrastructure**: AWS CDK for deployment (API Gateway + Lambda)
- **Development**: TypeScript with local development server support

## Common Development Commands

### Local Development
- `npm run dev` - Start local development server with hot reload using tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation
- `npm run test` - Run Jest tests

### CDK Infrastructure
- `npm run cdk` - Access CDK CLI
- `npm run cdk:watch` - Deploy with hot-swap and watch mode
- `npx cdk deploy` - Deploy stack to AWS
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Generate CloudFormation template
- `npx cdk destroy` - Remove deployed stack

## Code Architecture

### Key Files Structure
- `bin/line-bot-sample.ts` - CDK app entry point
- `lib/line-bot-sample-stack.ts` - CDK stack definition with Lambda and API Gateway
- `lambda/app.ts` - Main Hono application with webhook handling
- `lambda/handler.ts` - Lambda handler wrapper for Hono app
- `lambda/index.ts` - Local development server

### Lambda Function Details
The Lambda function (`lambda/handler.ts:4`) uses:
- **Hono framework** for HTTP routing and middleware
- **AWS Lambda Powertools** for structured logging
- **LINE Bot SDK** for messaging API integration
- **Node.js 22.x runtime** with TypeScript compilation

### Environment Variables Required
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot channel access token
- `LINE_CHANNEL_SECRET` - LINE Bot channel secret

Both are configured in the CDK stack (`lib/line-bot-sample-stack.ts:31-32`) and must be set in your environment before deployment.

### CDK Stack Components
- **Lambda Function**: Node.js function with Powertools layer
- **API Gateway**: REST API that proxies requests to Lambda
- **CloudWatch Logs**: 1-day retention policy for cost optimization
- **External Modules**: AWS SDK and Powertools excluded from bundle for size optimization

### Bot Message Flow
1. LINE sends webhook POST to `/webhook` endpoint
2. API Gateway triggers Lambda function
3. Hono app processes the webhook event
4. Event handlers process different message types:
   - `textEventHandler` (`lambda/app.ts:16`) processes text messages
   - `postbackEventHandler` (`lambda/app.ts:71`) processes button interactions
5. Bot behavior:
   - Text "入力を始める" → Shows button template with payment options (あやね/たかゆき/キャンセル)
   - Other text messages → Replies with "〜と言われましても" suffix
   - Button selections → Confirms user choice

### Button Template Messages
The bot supports interactive button templates for user selections:

**Template Structure:**
```typescript
{
  type: "template",
  altText: "fallback text for unsupported clients",
  template: {
    type: "buttons", 
    text: "display text",
    actions: [
      {
        type: "postback",
        label: "button label",
        data: "custom_data_string"
      }
    ]
  }
}
```

**Current Implementation:**
- Trigger: Send text "入力を始める"
- Response: Button template with payment user selection
- Actions: Postback events with data format `payment_user=value`

## Development Notes

### Testing
- Jest configuration in `jest.config.js`
- Sample tests in `test/` directory (currently commented out)
- Run tests with `npm run test`

### Local vs Lambda Execution
- `lambda/index.ts` provides local development server on port 3000
- `lambda/handler.ts` provides Lambda runtime wrapper
- Same Hono app (`lambda/app.ts`) handles both environments

### CDK Configuration
- Uses modern CDK feature flags in `cdk.json`
- Removal policy set to destroy for development convenience
- TypeScript compilation with ES2022 target and NodeNext modules