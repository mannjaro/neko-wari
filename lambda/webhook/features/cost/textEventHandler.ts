import type * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import type { PaymentCategory } from "../../../shared/types";
import { BOT_MESSAGES } from "../../../shared/constants";
import { userService } from "../../../backend/features/user/userService";
import {
  createUserSelectionTemplate,
  createConfirmationTemplate,
} from "./lineTemplates";
import { getAcceptedUsers } from "./userCache";

const logger = new Logger({ serviceName: "textEventHandler" });

export const textEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent,
): Promise<void> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const { replyToken, message: { text } = {}, source } = event;
  const userId = source?.userId || "unknown";

  let response: line.Message;

  if (text === "入力を始める") {
    // Reset user state and start fresh
    await userService.saveUserState(userId, { step: "idle" });

    // Fetch accepted users
    const users = await getAcceptedUsers();

    if (users.length === 0) {
      response = {
        type: "text",
        text: "❌ 登録済みユーザーが見つかりません。管理者に連絡してください。",
      };
    } else {
      const buttonTemplate = createUserSelectionTemplate(users);

      response = {
        type: "template",
        altText: BOT_MESSAGES.START,
        template: buttonTemplate,
      };
    }
  } else if (text === "やめる" || text === "キャンセル" || text === "終了") {
    // Cancel current session and clear state
    await userService.deleteUserState(userId);

    response = {
      type: "text",
      text: BOT_MESSAGES.SESSION_CANCELLED,
    };
  } else {
    // Check current state and validate step order
    const currentState = await userService.getUserState(userId);

    if (currentState?.step === "waiting_memo") {
      // Save memo and move to price input
      await userService.saveUserState(userId, {
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

      if (Number.isNaN(price) || price <= 0) {
        response = {
          type: "text",
          text: BOT_MESSAGES.PRICE_ERROR,
        };
      } else {
        // Save price and show confirmation
        await userService.saveUserState(userId, {
          ...currentState,
          step: "confirming",
          price: price,
        });

        // Look up display name from LINE user ID
        const users = await getAcceptedUsers();
        const selectedUser = users.find(
          (u) => u.lineUserId === currentState.user,
        );
        const displayName =
          selectedUser?.displayName || currentState.user || "";

        const confirmTemplate = createConfirmationTemplate(
          displayName,
          currentState.category as PaymentCategory,
          currentState.memo || "",
          price,
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
