import type * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import type { PaymentCategory } from "../../../shared/types";
import {
  CATEGORY_NAMES,
  BOT_MESSAGES,
  POSTBACK_DATA,
} from "../../../shared/constants";
import { userService } from "../../../backend/features/user/userService";
import { costService } from "../../../backend/features/cost/costService";
import {
  createCategoryCarouselTemplate,
  createMemoQuickReply,
} from "./lineTemplates";
import { getAcceptedUsers } from "./userCache";

const logger = new Logger({ serviceName: "postbackEventHandler" });

export const postbackEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent,
): Promise<void> => {
  if (event.type !== "postback") {
    return;
  }

  const { replyToken, postback: { data } = {}, source } = event;
  const userId = source?.userId || "unknown";

  let response: line.Message;
  const currentState = await userService.getUserState(userId);

  if (data === POSTBACK_DATA.CANCEL) {
    // Clear state when cancel is clicked
    await userService.deleteUserState(userId);
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
        case "user_selected": {
          // No previous step to go back to - cancel and reset
          await userService.deleteUserState(userId);
          response = {
            type: "text",
            text: BOT_MESSAGES.OPERATION_CANCELLED,
          };
          break;
        }
        case "waiting_memo": {
          // Go back to category selection
          await userService.saveUserState(userId, {
            step: "user_selected",
            user: currentState.user || "",
          });
          response = {
            type: "template",
            altText: "支払いカテゴリを選択してください",
            template: createCategoryCarouselTemplate(currentState.user || ""),
          };
          break;
        }
        case "waiting_price": {
          // Go back to memo input
          await userService.saveUserState(userId, {
            step: "waiting_memo",
            user: currentState.user || "",
            category: currentState.category,
          });
          // Look up display name
          const usersForPrice = await getAcceptedUsers();
          const userForPrice = usersForPrice.find(
            (u) => u.lineUserId === currentState.user,
          );
          const displayNameForPrice =
            userForPrice?.displayName || currentState.user || "";
          response = {
            type: "text",
            text: `${displayNameForPrice}さんの${CATEGORY_NAMES[currentState.category as PaymentCategory]}を選択しました。\n\n📝 備考があれば入力してください（下から選択または直接入力）。`,
            quickReply: createMemoQuickReply(currentState.category),
          };
          break;
        }
        case "confirming": {
          // Go back to price input
          await userService.saveUserState(userId, {
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
        }
        default:
          response = {
            type: "text",
            text: BOT_MESSAGES.INVALID_OPERATION,
          };
      }
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
      const lineUserId = params.get("user");

      // Validate that the user matches current state
      if (lineUserId !== currentState.user) {
        response = {
          type: "text",
          text: BOT_MESSAGES.INVALID_OPERATION,
        };
      } else {
        // Set user state to wait for memo input
        await userService.saveUserState(userId, {
          step: "waiting_memo",
          user: lineUserId || "",
          category: category,
        });

        // Look up display name for message
        const users = await getAcceptedUsers();
        const selectedUser = users.find((u) => u.lineUserId === lineUserId);
        const displayName = selectedUser?.displayName || lineUserId || "";

        response = {
          type: "text",
          text: `${displayName}さんの${CATEGORY_NAMES[category]}を選択しました。\n\n📝 備考があれば入力してください（下から選択または直接入力）。`,
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
          await costService.saveCostData(userId, currentState);

          // Look up display name for confirmation message
          const usersForConfirm = await getAcceptedUsers();
          const userForConfirm = usersForConfirm.find(
            (u) => u.lineUserId === currentState.user,
          );
          const displayNameForConfirm =
            userForConfirm?.displayName || currentState.user || "";

          response = {
            type: "text",
            text: `✅ 支払い情報を登録しました！\n\n👤 ${
              displayNameForConfirm
            }さん\n📋 ${CATEGORY_NAMES[currentState.category as PaymentCategory]}\n📝 ${
              currentState.memo || "なし"
            }\n💰 ${(currentState.price || 0).toLocaleString()}円${
              BOT_MESSAGES.NEW_ENTRY_HINT
            }`,
          };

          // Clear user state after successful registration
          await userService.deleteUserState(userId);
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
        await userService.deleteUserState(userId);
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
