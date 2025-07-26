import * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import { BOT_MESSAGES } from "../../backend/constants";
import {
  getUserState,
  saveUserState,
  deleteUserState,
} from "../../backend/services/dynamodb";
import {
  createUserSelectionTemplate,
  createConfirmationTemplate,
} from "../templates/lineTemplates";

const logger = new Logger({ serviceName: "textEventHandler" });

export const textEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent
): Promise<void> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const { replyToken, message: { text } = {}, source } = event;
  const userId = source?.userId || "unknown";

  let response: line.Message;

  if (text === "入力を始める") {
    // Reset user state and start fresh
    await saveUserState(userId, { step: "idle" });

    const buttonTemplate = createUserSelectionTemplate();

    response = {
      type: "template",
      altText: BOT_MESSAGES.START,
      template: buttonTemplate,
    };
  } else if (text === "やめる" || text === "キャンセル" || text === "終了") {
    // Cancel current session and clear state
    await deleteUserState(userId);

    response = {
      type: "text",
      text: BOT_MESSAGES.SESSION_CANCELLED,
    };
  } else {
    // Check current state and validate step order
    const currentState = await getUserState(userId);

    if (currentState?.step === "waiting_memo") {
      // Save memo and move to price input
      await saveUserState(userId, {
        ...currentState,
        step: "waiting_price",
        memo: text || "",
      });

      response = {
        type: "text",
        text: BOT_MESSAGES.MEMO_SAVED,
      };
    } else if (currentState?.step === "waiting_price") {
      const price = parseFloat(text?.replace(/[,¥円]/g, "") || "0");

      if (isNaN(price) || price <= 0) {
        response = {
          type: "text",
          text: BOT_MESSAGES.PRICE_ERROR,
        };
      } else {
        // Save price and show confirmation
        await saveUserState(userId, {
          ...currentState,
          step: "confirming",
          price: price,
        });

        const confirmTemplate = createConfirmationTemplate(
          currentState.user!,
          currentState.category!,
          currentState.memo || "",
          price
        );

        response = {
          type: "template",
          altText: "登録確認",
          template: confirmTemplate,
        };
      }
    } else if (currentState && currentState.step !== "idle") {
      // User is in middle of flow but sent unexpected text
      response = {
        type: "text",
        text: BOT_MESSAGES.FLOW_ERROR,
      };
    } else {
      // User not in any flow or invalid input
      response = {
        type: "text",
        text: BOT_MESSAGES.START_HINT,
      };
    }
  }

  const replyMessageRequest: line.messagingApi.ReplyMessageRequest = {
    replyToken: replyToken,
    messages: [response],
  };

  logger.info("%o", replyMessageRequest);

  await client.replyMessage(replyMessageRequest);
};
