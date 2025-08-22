import type { DiffAmount } from "@/types";

export function calcDiff(payments: Map<string, number>): DiffAmount {
  // 二人の立替額から，より多く支払った人に対して他方の人が払うべき金額を計算し，支払う方向を決める
  // paymentsは必ず2人分のデータしか存在しない
  // 金額の計算ロジックは，（多く支払った金額 - 他方の金額）/ 2
  const entries = Array.from(payments.entries());

  if (entries.length !== 2) {
    throw new Error("payments map must contain exactly 2 entries");
  }

  const entry1 = entries[0];
  const entry2 = entries[1];

  if (!entry1 || !entry2) {
    throw new Error("Invalid entries in payments map");
  }

  const [user1, amount1] = entry1;
  const [user2, amount2] = entry2;

  const diff = Math.abs(amount1 - amount2) / 2;

  if (amount1 > amount2) {
    return { amount: diff, from: user2, to: user1 };
  } else {
    return { amount: diff, from: user1, to: user2 };
  }
}