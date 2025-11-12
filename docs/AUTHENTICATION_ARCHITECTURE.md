# Authentication Architecture

## Overview

The application uses **two separate authentication mechanisms** for different parts of the system:

1. **JWT Authentication** (Cognito) - For frontend dashboard API
2. **Signature Verification** (LINE) - For webhook callbacks

These are handled by **two separate Lambda functions** to maintain proper separation of concerns.

## Architecture Diagram

```
                        API Gateway
                             |
                    /--------+--------\
                   /                   \
                  /                     \
         /webhook route             All other routes
                |                         |
                v                         v
        Webhook Lambda              Backend Lambda
                |                         |
        LINE Signature              JWT (Cognito)
        Verification               Verification
                |                         |
                v                         v
        LINE Bot Events          Dashboard API
     (User creates costs         (User creates costs
      via LINE chat)              via web interface)
```

## Lambda Functions

### 1. Backend Lambda (`lambda/backend/`)

**Purpose:** Handles authenticated dashboard API requests

**Authentication:** JWT tokens from AWS Cognito
- Verifies JWT signature using Cognito JWKS
- Extracts user identity from `sub` claim
- Applied via `authMiddleware` to all routes

**Routes:**
- `POST /cost/create` - Create cost entry
- `PUT /user/:uid/detail/:timestamp` - Update cost entry
- `DELETE /user/:uid/detail/:timestamp` - Delete cost entry
- `GET /dashboard/monthly` - Get monthly summary
- `GET /dashboard/user/details` - Get user details
- `GET /dashboard/category/summary` - Get category summary
- `GET /` - Health check (no auth required)

**Handler:** `lambda/backend/handler.ts`
```typescript
import app from "./app";
import { handle } from "hono/aws-lambda";

export const handler = handle(app);
```

**Middleware:** `lambda/backend/middleware/authMiddleware.ts`
```typescript
// Verify JWT token from Cognito
const { payload } = await jwtVerify(token, JWKS, {
  issuer: COGNITO_ISSUER,
});

// Extract user information
const user: AuthenticatedUser = {
  sub: payload.sub as string,
  email: payload.email as string,
  // ...
};
```

### 2. Webhook Lambda (`lambda/webhook/`)

**Purpose:** Handles LINE Bot webhook callbacks

**Authentication:** LINE signature verification
- Verifies request signature using LINE channel secret
- Validates request authenticity from LINE platform
- No JWT tokens involved

**Routes:**
- `POST /webhook` - LINE webhook endpoint
- `GET /` - Health check

**Handler:** `lambda/webhook/handler.ts`
```typescript
import app from "./app";
import { handle } from "hono/aws-lambda";

export const handler = handle(app);
```

**Webhook Handler:** `lambda/webhook/handlers/webhookHandler.ts`
```typescript
// LINE signature verification
const signature = crypto
  .createHmac("SHA256", channelSecret)
  .update(body)
  .digest("base64");

if (signature !== requestSignature) {
  throw new Error("Invalid signature");
}
```

## API Gateway Configuration

The API Gateway is configured to route requests to the appropriate Lambda function:

```typescript
// lib/constructs/backend.ts

// Backend Lambda - handles default routes
const api = new apigwv2.HttpApi(this, "Api", {
  defaultIntegration: new apigwIntegv2.HttpLambdaIntegration("Integ", fn),
});

// Webhook Lambda - handles /webhook route
const webhookInteg = new apigwIntegv2.HttpLambdaIntegration(
  "WebhookInteg",
  webhookFn
);

api.addRoutes({
  path: "/webhook",
  integration: webhookInteg,
});
```

**Key Point:** `/webhook` requests **never reach** the Backend Lambda, so JWT authentication is not applied to webhook requests.

## Authentication Flows

### Frontend (Dashboard) Authentication Flow

```
1. User logs in via Cognito hosted UI
   └─> Receives JWT tokens (access_token, id_token, refresh_token)

2. Frontend makes API request
   └─> Includes: Authorization: ******

3. API Gateway routes to Backend Lambda
   └─> Lambda receives request

4. authMiddleware runs
   └─> Verifies JWT signature
   └─> Extracts user from token
   └─> Stores in context

5. Handler executes
   └─> Uses authenticated user context
   └─> Returns response
```

### Webhook (LINE Bot) Authentication Flow

```
1. LINE platform sends webhook event
   └─> Includes: X-Line-Signature header

2. API Gateway routes to Webhook Lambda
   └─> Lambda receives request

3. webhookHandler runs
   └─> Verifies LINE signature
   └─> Validates request authenticity

4. Event handlers execute
   └─> Process LINE events
   └─> Use LINE user ID from event
   └─> Returns response to LINE
```

## Code Organization

### Backend Lambda Structure

```
lambda/backend/
├── app.ts                      # Hono app with JWT middleware
├── handler.ts                  # Lambda handler
├── middleware/
│   └── authMiddleware.ts       # JWT verification
├── handlers/
│   ├── dashboardHandlers.ts
│   └── updateHandlers.ts
├── repositories/
│   ├── userMappingRepository.ts
│   └── costDataRepository.ts
└── services/
    └── costService.ts
```

### Webhook Lambda Structure

```
lambda/webhook/
├── app.ts                      # Hono app (no JWT middleware)
├── handler.ts                  # Lambda handler
├── handlers/
│   ├── webhookHandler.ts       # LINE signature verification
│   ├── textEventHandler.ts
│   └── postbackEventHandler.ts
└── templates/
    └── lineTemplates.ts
```

## Middleware Application

### Backend Lambda Middleware

```typescript
// lambda/backend/app.ts

// Apply authentication middleware to all routes except health check
app.use("*", async (c, next) => {
  // Skip authentication for health check only
  // Note: /webhook is handled by a separate Lambda function
  if (c.req.path === "/") {
    return next();
  }
  return authMiddleware(c, next);
});
```

**Important:** The check for `/webhook` was removed because:
1. Webhook requests are routed to a separate Lambda function
2. They never reach the Backend Lambda
3. The check was redundant and potentially confusing

### Webhook Lambda (No JWT Middleware)

```typescript
// lambda/webhook/app.ts

// No JWT middleware - uses LINE signature verification instead
app.post("/webhook", async (c) => {
  const reqBody = c.env.event.body || "";
  const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = env(c);

  const result = await webhookHandler(
    reqBody,
    LINE_CHANNEL_ACCESS_TOKEN,
    LINE_CHANNEL_SECRET
  );

  return c.text(result);
});
```

## Security Considerations

### JWT Authentication (Backend)

**Strengths:**
- Industry-standard authentication
- Cryptographically signed tokens
- Short-lived access tokens (1 hour)
- Refresh token rotation
- Verified against Cognito JWKS

**Token Flow:**
1. User authenticates with Cognito
2. Receives signed JWT tokens
3. Frontend includes token in API requests
4. Backend verifies token signature
5. Extracts user identity from claims

### LINE Signature Verification (Webhook)

**Strengths:**
- HMAC-SHA256 signature
- Request authenticity guaranteed
- Shared secret (channel secret)
- Prevents replay attacks
- LINE platform verification

**Signature Flow:**
1. LINE platform sends webhook event
2. Includes `X-Line-Signature` header
3. Webhook Lambda computes signature
4. Compares with header signature
5. Rejects if mismatch

## Why Two Separate Lambda Functions?

### 1. **Security Isolation**
- Different authentication mechanisms
- Separate security boundaries
- LINE webhook doesn't need Cognito access
- Dashboard API doesn't need LINE channel secret

### 2. **Independent Scaling**
- Webhook events and API calls scale independently
- Different traffic patterns
- Separate resource allocation
- Better cost optimization

### 3. **Deployment Flexibility**
- Can deploy webhook updates independently
- Backend API changes don't affect webhook
- Different deployment schedules
- Easier rollback

### 4. **Clear Separation of Concerns**
- Webhook handles LINE Bot events
- Backend handles dashboard API
- No mixing of responsibilities
- Easier to understand and maintain

## Common Misconceptions

### ❌ "Webhook needs JWT authentication"

**Wrong:** Webhooks from LINE platform don't include JWT tokens. They use signature-based authentication.

### ❌ "Backend Lambda handles webhook requests"

**Wrong:** The API Gateway routes `/webhook` to a separate Lambda function. Backend Lambda never sees webhook requests.

### ❌ "Need to skip JWT auth for /webhook in backend"

**Wrong:** This check is unnecessary because webhook requests never reach the backend Lambda.

### ✅ "Two Lambda functions, two authentication methods"

**Correct:** Backend uses JWT, Webhook uses LINE signatures. They operate independently.

## Testing Authentication

### Backend API Test

```bash
# Without token - should fail
curl https://api.example.com/cost/create \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"category":"rent","price":100000,"memo":"test"}'

# Response: 401 Unauthorized

# With valid token - should succeed
curl https://api.example.com/cost/create \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: ******
  -d '{"category":"rent","price":100000,"memo":"test"}'

# Response: 200 OK
```

### Webhook Test

```bash
# Without signature - should fail
curl https://api.example.com/webhook \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"events":[...]}'

# Response: 500 Error (invalid signature)

# With valid signature - should succeed
curl https://api.example.com/webhook \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: <valid_signature>" \
  -d '{"events":[...]}'

# Response: 200 OK
```

## Troubleshooting

### Issue: "Webhook returns 401 Unauthorized"

**Diagnosis:** Webhook requests are incorrectly being routed to Backend Lambda

**Solution:** 
- Check API Gateway route configuration
- Ensure `/webhook` route points to Webhook Lambda
- Verify Lambda function ARN in CDK stack

### Issue: "Dashboard API returns 401 even with token"

**Diagnosis:** JWT token verification failing

**Solution:**
- Check token expiration
- Verify Cognito configuration matches code
- Ensure JWKS endpoint is accessible
- Check token issuer matches expected value

### Issue: "LINE Bot not responding"

**Diagnosis:** Signature verification failing

**Solution:**
- Verify LINE channel secret is correct
- Check webhook URL is registered in LINE console
- Ensure signature calculation matches LINE's method
- Validate request body encoding

## References

- **JWT Verification**: `lambda/backend/middleware/authMiddleware.ts`
- **LINE Signature**: `lambda/webhook/handlers/webhookHandler.ts`
- **API Gateway Config**: `lib/constructs/backend.ts`
- **Backend App**: `lambda/backend/app.ts`
- **Webhook App**: `lambda/webhook/app.ts`

## Summary

The application uses a **two-Lambda architecture** with **separate authentication mechanisms**:

1. **Backend Lambda**: JWT authentication for dashboard API
2. **Webhook Lambda**: LINE signature verification for bot events

This design provides security isolation, independent scaling, and clear separation of concerns. JWT authentication is **not used for webhooks** and **webhook authentication does not use JWT**.
