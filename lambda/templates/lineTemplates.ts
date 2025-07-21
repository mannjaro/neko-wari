import { TemplateButtons, TemplateCarousel, TemplateConfirm, QuickReply, QuickReplyItem } from "@line/bot-sdk";
import type { PaymentCategory } from "../types.js";
import { CATEGORY_NAMES, CATEGORY_IMAGES, CATEGORY_DESCRIPTIONS, BOT_MESSAGES, POSTBACK_DATA, MEMO_QUICK_REPLIES } from "../constants.js";

/**
 * Creates initial user selection button template
 */
export const createUserSelectionTemplate = (): TemplateButtons => ({
  type: "buttons",
  text: BOT_MESSAGES.START,
  actions: [
    {
      type: "postback",
      label: "****",
      data: "payment_user=****",
    },
    {
      type: "postback", 
      label: "****",
      data: "payment_user=****",
    },
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
export const createCategoryCarouselTemplate = (selectedUser: string): TemplateCarousel => ({
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
        label: "キャンセル", 
        data: POSTBACK_DATA.CANCEL,
      },
    ],
  })),
});

/**
 * Creates quick reply for memo input
 */
export const createMemoQuickReply = (): QuickReply => ({
  items: MEMO_QUICK_REPLIES.map((memo): QuickReplyItem => ({
    type: "action",
    action: {
      type: "message",
      label: memo,
      text: memo,
    },
  })),
});

/**
 * Creates confirmation template for final review
 */
export const createConfirmationTemplate = (
  user: string,
  category: PaymentCategory,
  memo: string,
  price: number
): TemplateConfirm => ({
  type: "confirm",
  text: `以下の内容で登録しますか？\n\n👤 ${user}さん\n📋 ${CATEGORY_NAMES[category]}\n📝 ${memo || "なし"}\n💰 ${price.toLocaleString()}円`,
  actions: [
    {
      type: "postback",
      label: "登録する",
      data: POSTBACK_DATA.CONFIRM_YES,
    },
    {
      type: "postback",
      label: "キャンセル",
      data: POSTBACK_DATA.CONFIRM_NO,
    },
  ],
});