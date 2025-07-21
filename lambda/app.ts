import { Hono } from "hono";
import { env } from "hono/adapter";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";

import * as line from "@line/bot-sdk";
import * as Lambda from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "serverlessAirline" });

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const textEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent
): Promise<line.MessageAPIResponseBase | undefined> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const { replyToken, message: { text } = {} } = event;

  const response: line.TextMessage = {
    type: "text",
    text: `${text}と言われましても`,
  };

  const replyMessageRequest: line.messagingApi.ReplyMessageRequest = {
    replyToken: replyToken,
    messages: [response],
  };

  logger.info("%o", replyMessageRequest);

  await client.replyMessage(replyMessageRequest);
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Status: OK"));

app.post("/webhook", async (c) => {
  const reqBody = c.env.event.body;
  logger.info(`Received webhook event: ${reqBody}`);
  const body = JSON.parse(reqBody || "{}");
  const webhookEvents = body.events || [];
  const { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET } = env<{
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_CHANNEL_SECRET: string;
  }>(c);
  const config = {
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
  };
  const client = new line.messagingApi.MessagingApiClient(config);
  line.middleware({
    channelSecret: LINE_CHANNEL_SECRET,
  });

  const events: line.WebhookEvent[] = webhookEvents;
  await Promise.all(
    events.map(async (event: line.WebhookEvent) => {
      try {
        logger.info("Processing event: %o", event);
        await textEventHandler(client, event);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error processing event:", err.message);
        }
        return c.status(500);
      }
    })
  );
  c.status(200);
  return c.text("Webhook processed successfully");
});

export default app;
