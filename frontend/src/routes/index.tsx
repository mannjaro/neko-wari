// src/routes/index.tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getMonthlyCost } from "@/server/getMonthly";
import { Suspense } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

type DiffAmount = {
  amount: number;
  from: string;
  to: string;
};

const deferredQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["monthly", "cost", year, month],
    queryFn: () => getMonthlyCost({ data: { year, month } }),
  });

export const Route = createFileRoute("/")({
  component: Home,
  loader: ({ context }) => {
    const now = new Date();
    context.queryClient.prefetchQuery(
      deferredQueryOptions(now.getFullYear(), now.getMonth() + 1),
    );
  },
  errorComponent: () => (
    <div>
      <p>error</p>
    </div>
  ),
});

function calcDiff(payments: Map<string, number>): DiffAmount {
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

function Price({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);

  return <span>{formatted}</span>;
}

function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return (
    <div className="p-2">
      <Suspense fallback="Loading Middleman...">
        <DeferredCostTable year={year} month={month} />
      </Suspense>
    </div>
  );
}

function DeferredCostTable({ year, month }: { year: number; month: number }) {
  const deferredQuery = useSuspenseQuery(deferredQueryOptions(year, month));
  const paymentsMap = new Map(
    deferredQuery.data.userSummaries.map((user) => [
      user.user,
      user.totalAmount,
    ]),
  );
  const diffResult = paymentsMap.size === 2 ? calcDiff(paymentsMap) : null;

  return (
    <div>
      {diffResult && (
        <Card>
          <CardHeader>
            <CardTitle>{month}月 支払い金額</CardTitle>
            <CardDescription> （多い方 - 少ない方） / 2</CardDescription>
          </CardHeader>
          <CardContent>
            <Price amount={diffResult.amount} />
          </CardContent>
          <CardFooter>
            <div>
              <p>From to</p>
              <span>
                {diffResult.from} → {diffResult.to}
              </span>
            </div>
          </CardFooter>
        </Card>
      )}
      <Table>
        <TableCaption>Monthly Cost</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>User name</TableHead>
            <TableHead>Total amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deferredQuery.data.userSummaries.map((user) => (
            <TableRow key={user.userId}>
              <TableCell>{user.user}</TableCell>
              <TableCell>{user.totalAmount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
