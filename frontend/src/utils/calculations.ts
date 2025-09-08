import type { DiffAmount } from "@/types";

export function calcDiff(payments: Map<string, number>): DiffAmount | null {
  // 立替額から支払い情報を計算する
  // 1人の場合: その人の半額を相手が支払うべき
  // 2人の場合: より多く支払った人に対して他方の人が払うべき金額を計算
  const entries = Array.from(payments.entries());
  
  if (entries.length === 0 || entries.length > 2) {
    return null;
  }
  
  // 1人または2人の場合の共通処理
  const amounts = entries.map(([, amount]) => amount);
  const users = entries.map(([user]) => user);
  
  const maxAmount = Math.max(...amounts);
  const minAmount = amounts.length === 1 ? 0 : Math.min(...amounts);
  const diff = (maxAmount - minAmount) / 2;
  
  const payerIndex = amounts.indexOf(maxAmount);
  const payer = users[payerIndex];
  const receiver = amounts.length === 1 ? "相手" : users[1 - payerIndex];
  
  if (!payer || (!receiver && amounts.length > 1)) {
    return null;
  }
  
  return { amount: diff, from: receiver || "相手", to: payer };
}