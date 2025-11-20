import { Hono } from "hono";
import { env } from "hono/adapter";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";

import { webhookHandler } from "./features/core/webhookHandler";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Status: OK"));
app.post("/webhook", async (c) => {
  try {
    const reqBody = c.env.event.body || "";
    const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = env<{
      LINE_CHANNEL_ACCESS_TOKEN: string;
      LINE_CHANNEL_SECRET: string;
    }>(c);

    const result = await webhookHandler(
      reqBody,
      LINE_CHANNEL_ACCESS_TOKEN,
      LINE_CHANNEL_SECRET,
    );

    c.status(200);
    return c.text(result);
  } catch (error) {
    c.status(500);
    return c.text("Error processing webhook");
  }
});

export default app;
