export function Price({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);

  return <span>{formatted}</span>;
}
