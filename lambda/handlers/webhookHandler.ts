import * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import { textEventHandler } from "./textEventHandler";
import { postbackEventHandler } from "./postbackEventHandler";

const logger = new Logger({ serviceName: "webhookHandler" });

export const webhookHandler = async (
  reqBody: string,
  LINE_CHANNEL_ACCESS_TOKEN: string,
  LINE_CHANNEL_SECRET: string
) => {
  logger.info(`Received webhook event: ${reqBody}`);
  const body = JSON.parse(reqBody || "{}");
  const webhookEvents = body.events || [];

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
        if (event.type === "message") {
          await textEventHandler(client, event);
        } else if (event.type === "postback") {
          await postbackEventHandler(client, event);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error processing event:", err.message);
        }
        throw err;
      }
    })
  );

  return "Webhook processed successfully";
};
