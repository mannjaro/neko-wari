import { Hono } from "hono";
import { env } from "hono/adapter";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";

import * as line from "@line/bot-sdk";
import { Logger } from "@aws-lambda-powertools/logger";

import type { PaymentCategory } from "./types.js";
import { CATEGORY_NAMES, BOT_MESSAGES, POSTBACK_DATA } from "./constants.js";
import {
  getUserState,
  saveUserState,
  deleteUserState,
  saveCostData,
  generateMonthlySummary,
  getUserDetailData,
  generateCategorySummary,
} from "./services/dynamodb.js";
import {
  createUserSelectionTemplate,
  createCategoryCarouselTemplate,
  createConfirmationTemplate,
  createMemoQuickReply,
} from "./templates/lineTemplates.js";

const logger = new Logger({ serviceName: "lineBotApp" });

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const textEventHandler = async (
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

const postbackEventHandler = async (
  client: line.messagingApi.MessagingApiClient,
  event: line.WebhookEvent
): Promise<void> => {
  if (event.type !== "postback") {
    return;
  }

  const { replyToken, postback: { data } = {}, source } = event;
  const userId = source?.userId || "unknown";

  let response: line.Message;
  const currentState = await getUserState(userId);

  if (data === POSTBACK_DATA.CANCEL) {
    // Clear state when cancel is clicked
    await deleteUserState(userId);
    response = {
      type: "text",
      text: BOT_MESSAGES.OPERATION_CANCELLED,
    };
  } else if (
    data === "payment_user=****" ||
    data === "payment_user=****"
  ) {
    // Validate step: should be idle or just started
    if (!currentState || currentState.step !== "idle") {
      response = {
        type: "text",
        text: BOT_MESSAGES.INVALID_OPERATION,
      };
    } else {
      const selectedUser =
        data === "payment_user=****" ? "****" : "****";

      // Update state to user_selected
      await saveUserState(userId, {
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
        await saveUserState(userId, {
          step: "waiting_memo",
          user: user || "",
          category: category,
        });

        response = {
          type: "text",
          text: `${user}さんの${CATEGORY_NAMES[category]}を選択しました。\n\n📝 備考があれば入力してください（下から選択または直接入力）。`,
          quickReply: createMemoQuickReply(),
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
          await saveCostData(userId, currentState);

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
          await deleteUserState(userId);
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
        await deleteUserState(userId);
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

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Status: OK"));

// Dashboard API endpoints
app.get("/dashboard/monthly", async (c) => {
  try {
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;
    const summary = await generateMonthlySummary(yearMonth);
    return c.json(summary);
  } catch (error) {
    logger.error("Error in monthly dashboard API", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/dashboard/user/details", async (c) => {
  try {
    const userId = c.req.query("userId");
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;

    if (!userId || !yearMonth) {
      return c.json(
        { error: "userId and yearMonth parameters are required" },
        400
      );
    }

    // Validate yearMonth format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "yearMonth must be in YYYY-MM format" }, 400);
    }

    const userDetails = await getUserDetailData(userId, yearMonth);
    return c.json(userDetails);
  } catch (error) {
    logger.error("Error in user details dashboard API", { error });

    if (error instanceof Error && error.message.includes("No data found")) {
      return c.json({ error: error.message }, 404);
    }

    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/dashboard/category/summary", async (c) => {
  try {
    const year = c.req.query("year");
    const month = c.req.query("month");

    if (!year || !month) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }

    // Validate yearMonth format (YYYY)
    if (!/^\d{4}$/.test(year)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY?&mounth=MM format" },
        400
      );
    }
    // Validate yearMonth format (MM)
    if (!/^\d{2}$/.test(month)) {
      return c.json(
        { error: "yearMonth must be in ?year=YYYY&month=MM format" },
        400
      );
    }

    const yearMonth = `${year}-${month}`;

    if (!yearMonth) {
      return c.json({ error: "yearMonth parameter is required" }, 400);
    }

    // Validate yearMonth format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return c.json({ error: "yearMonth must be in YYYY-MM format" }, 400);
    }

    const categorySummary = await generateCategorySummary(yearMonth);
    return c.json(categorySummary);
  } catch (error) {
    logger.error("Error in category summary dashboard API", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
});

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
        if (event.type === "message") {
          await textEventHandler(client, event);
        } else if (event.type === "postback") {
          await postbackEventHandler(client, event);
        }
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
