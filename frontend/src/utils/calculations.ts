import type { DiffAmount } from "@/types";

export function calcDiff(
  payments: Map<string, number>,
  chargeAmounts?: Map<string, number>,
): DiffAmount | null {
  // payments = split-only totals per user
  // chargeAmounts = charge-only totals per user
  const entries = Array.from(payments.entries());

  if (entries.length === 0 || entries.length > 2) {
    return null;
  }

  const amounts = entries.map(([, amount]) => amount);
  const users = entries.map(([user]) => user);

  if (entries.length === 1) {
    const splitAmount = amounts[0] / 2;
    const chargeAmount = chargeAmounts?.get(users[0]) ?? 0;
    const total = splitAmount + chargeAmount;
    return {
      amount: total,
      splitAmount,
      chargeAmount,
      from: "相手",
      to: users[0],
    };
  }

  // 2 users
  const [user1, user2] = users as [string, string];
  const [split1, split2] = amounts as [number, number];
  const charge1 = chargeAmounts?.get(user1) ?? 0;
  const charge2 = chargeAmounts?.get(user2) ?? 0;

  // splitDiff > 0 means user1 should receive from user2
  const splitDiff = (split1 - split2) / 2;
  // chargeDiff > 0 means user1's charges → user2 pays user1
  const chargeDiff = charge1 - charge2;
  const net = splitDiff + chargeDiff;

  if (!user1 || !user2) {
    return null;
  }

  if (net >= 0) {
    return {
      amount: net,
      splitAmount: Math.abs(splitDiff),
      chargeAmount: Math.abs(chargeDiff),
      from: user2,
      to: user1,
    };
  } else {
    return {
      amount: Math.abs(net),
      splitAmount: Math.abs(splitDiff),
      chargeAmount: Math.abs(chargeDiff),
      from: user1,
      to: user2,
    };
  }
}
