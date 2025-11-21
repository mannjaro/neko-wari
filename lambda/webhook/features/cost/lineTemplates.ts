import type {
  TemplateButtons,
  TemplateCarousel,
  TemplateConfirm,
  QuickReply,
  QuickReplyItem,
} from "@line/bot-sdk";
import type { PaymentCategory } from "../../../shared/types";
import {
  CATEGORY_NAMES,
  CATEGORY_IMAGES,
  CATEGORY_DESCRIPTIONS,
  BOT_MESSAGES,
  POSTBACK_DATA,
  MEMO_QUICK_REPLIES_BY_CATEGORY,
} from "../../../shared/constants";
import type { AcceptedUser } from "./userCache";

/**
 * Creates initial user selection button template with dynamic users
 */
export const createUserSelectionTemplate = (
  users: AcceptedUser[],
): TemplateButtons => ({
  type: "buttons",
  text: BOT_MESSAGES.START,
  actions: [
    ...users.map((user) => ({
      type: "postback" as const,
      label: user.displayName,
      data: `payment_user=${user.lineUserId}`,
    })),
    {
      type: "postback",
      label: "キャンセル",
      data: POSTBACK_DATA.CANCEL,
    },
  ],
});

/**
 * Creates category selection carousel template
 */
export const createCategoryCarouselTemplate = (
  selectedUser: string,
): TemplateCarousel => ({
  type: "carousel",
  columns: Object.entries(CATEGORY_NAMES).map(([category, name]) => ({
    thumbnailImageUrl: CATEGORY_IMAGES[category as PaymentCategory],
    title: name,
    text: CATEGORY_DESCRIPTIONS[category as PaymentCategory],
    actions: [
      {
        type: "postback",
        label: "選択",
        data: `category=${category}&user=${selectedUser}`,
      },
      {
        type: "postback",
        label: "戻る",
        data: POSTBACK_DATA.BACK,
      },
    ],
  })),
});

/**
 * Creates quick reply for memo input based on selected category
 */
export const createMemoQuickReply = (
  category?: PaymentCategory,
): QuickReply => {
  const memoOptions = category
    ? MEMO_QUICK_REPLIES_BY_CATEGORY[category]
    : MEMO_QUICK_REPLIES_BY_CATEGORY.other;

  return {
    items: memoOptions.map(
      (memo): QuickReplyItem => ({
        type: "action",
        action: {
          type: "message",
          label: memo,
          text: memo,
        },
      }),
    ),
  };
};

/**
 * Creates confirmation template for final review
 */
export const createConfirmationTemplate = (
  displayName: string,
  category: PaymentCategory,
  memo: string,
  price: number,
): TemplateConfirm => ({
  type: "confirm",
  text: `以下の内容で登録しますか？\n\n👤 ${displayName}さん\n📋 ${
    CATEGORY_NAMES[category]
  }\n📝 ${memo || "なし"}\n💰 ${price.toLocaleString()}円`,
  actions: [
    {
      type: "postback",
      label: "登録する",
      data: POSTBACK_DATA.CONFIRM_YES,
    },
    {
      type: "postback",
      label: "戻る",
      data: POSTBACK_DATA.BACK,
    },
  ],
});
