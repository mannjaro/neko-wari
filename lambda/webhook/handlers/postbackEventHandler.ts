import * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import type { PaymentCategory } from "../../shared/types";
import {
  CATEGORY_NAMES,
  BOT_MESSAGES,
  POSTBACK_DATA,
} from "../../shared/constants";
import { userStateRepository } from "../../backend/repositories/userStateRepository";
import { costDataRepository } from "../../backend/repositories/costDataRepository";
import {
  createCategoryCarouselTemplate,
  createMemoQuickReply,
  createUserSelectionTemplate,
} from "../templates/lineTemplates";

const logger = new Logger({ serviceName: "postbackEventHandler" });

export const postbackEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent
): Promise<void> => {
  if (event.type !== "postback") {
    return;
  }

  const { replyToken, postback: { data } = {}, source } = event;
  const userId = source?.userId || "unknown";

  let response: line.Message;
  const currentState = await userStateRepository.getUserState(userId);

  if (data === POSTBACK_DATA.CANCEL) {
    // Clear state when cancel is clicked
    await userStateRepository.deleteUserState(userId);
    response = {
      type: "text",
      text: BOT_MESSAGES.OPERATION_CANCELLED,
    };
  } else if (data === POSTBACK_DATA.BACK) {
    // Handle back navigation
    if (!currentState) {
      response = {
        type: "text",
        text: BOT_MESSAGES.INVALID_OPERATION,
      };
    } else {
      switch (currentState.step) {
        case "user_selected":
          // Go back to user selection
          await userStateRepository.saveUserState(userId, { step: "idle" });
          response = {
            type: "template",
            altText: "支払い情報を選択してください",
            template: createUserSelectionTemplate(),
          };
          break;
        case "waiting_memo":
          // Go back to category selection
          await userStateRepository.saveUserState(userId, {
            step: "user_selected",
            user: currentState.user || "",
          });
          response = {
            type: "template",
            altText: "支払いカテゴリを選択してください",
            template: createCategoryCarouselTemplate(currentState.user || ""),
          };
          break;
        case "waiting_price":
          // Go back to memo input
          await userStateRepository.saveUserState(userId, {
            step: "waiting_memo",
            user: currentState.user || "",
            category: currentState.category,
          });
          response = {
            type: "text",
            text: `${currentState.user}さんの${CATEGORY_NAMES[currentState.category!]}を選択しました。\n\n📝 備考があれば入力してください（下から選択または直接入力）。`,
            quickReply: createMemoQuickReply(currentState.category),
          };
          break;
        case "confirming":
          // Go back to price input
          await userStateRepository.saveUserState(userId, {
            step: "waiting_price",
            user: currentState.user || "",
            category: currentState.category,
            memo: currentState.memo,
          });
          response = {
            type: "text",
            text: BOT_MESSAGES.MEMO_SAVED,
          };
          break;
        default:
          response = {
            type: "text",
            text: BOT_MESSAGES.INVALID_OPERATION,
          };
      }
    }
  } else if (
    data === "payment_user=ayane" ||
    data === "payment_user=takayuki"
  ) {
    // Validate step: should be idle or just started
    if (!currentState || currentState.step !== "idle") {
      response = {
        type: "text",
        text: BOT_MESSAGES.INVALID_OPERATION,
      };
    } else {
      const selectedUser =
        data === "payment_user=ayane" ? "あやね" : "たかゆき";

      // Update state to user_selected
      await userStateRepository.saveUserState(userId, {
        step: "user_selected",
        user: selectedUser,
      });

      const carouselTemplate = createCategoryCarouselTemplate(selectedUser);

      response = {
        type: "template",
        altText: "支払いカテゴリを選択してください",
        template: carouselTemplate,
      };
    }
  } else if (data?.startsWith("category=")) {
    // Validate step: should have user selected
    if (!currentState || currentState.step !== "user_selected") {
      response = {
        type: "text",
        text: BOT_MESSAGES.INVALID_OPERATION,
      };
    } else {
      const params = new URLSearchParams(data);
      const category = params.get("category") as PaymentCategory;
      const user = params.get("user");

      // Validate that the user matches current state
      if (user !== currentState.user) {
        response = {
          type: "text",
          text: BOT_MESSAGES.INVALID_OPERATION,
        };
      } else {
        // Set user state to wait for memo input
        await userStateRepository.saveUserState(userId, {
          step: "waiting_memo",
          user: user || "",
          category: category,
        });

        response = {
          type: "text",
          text: `${user}さんの${CATEGORY_NAMES[category]}を選択しました。\n\n📝 備考があれば入力してください（下から選択または直接入力）。`,
          quickReply: createMemoQuickReply(category),
        };
      }
    }
  } else if (data?.startsWith("confirm=")) {
    // Handle confirmation response
    if (!currentState || currentState.step !== "confirming") {
      response = {
        type: "text",
        text: "❌ 不正な操作です。「入力を始める」と入力して最初からやり直してください。",
      };
    } else {
      if (data === POSTBACK_DATA.CONFIRM_YES) {
        try {
          // Save cost data to DynamoDB
          await costDataRepository.saveCostData(userId, currentState);

          response = {
            type: "text",
            text: `✅ 支払い情報を登録しました！\n\n👤 ${
              currentState.user
            }さん\n📋 ${CATEGORY_NAMES[currentState.category!]}\n📝 ${
              currentState.memo || "なし"
            }\n💰 ${(currentState.price || 0).toLocaleString()}円${
              BOT_MESSAGES.NEW_ENTRY_HINT
            }`,
          };

          // Clear user state after successful registration
          await userStateRepository.deleteUserState(userId);
        } catch (error) {
          logger.error("Error saving cost data during confirmation", {
            error,
            userId,
            currentState,
          });
          response = {
            type: "text",
            text: BOT_MESSAGES.SAVE_ERROR,
          };
        }
      } else {
        response = {
          type: "text",
          text: BOT_MESSAGES.REGISTRATION_CANCELLED,
        };

        // Clear user state after cancellation
        await userStateRepository.deleteUserState(userId);
      }
    }
  } else {
    response = {
      type: "text",
      text: BOT_MESSAGES.UNKNOWN_SELECTION,
    };
  }

  const replyMessageRequest: line.messagingApi.ReplyMessageRequest = {
    replyToken: replyToken,
    messages: [response],
  };

  logger.info("%o", replyMessageRequest);

  await client.replyMessage(replyMessageRequest);
};
