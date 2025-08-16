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
import { Skeleton } from "@/components/ui/skeleton";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getMonthlyCost } from "@/server/getMonthly";
import { Suspense, useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { z } from "zod";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type DiffAmount = {
  amount: number;
  from: string;
  to: string;
};

// 検索パラメータのスキーマ定義
const searchSchema = z.object({
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
});

const deferredQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["monthly", "cost", year, month],
    queryFn: () => getMonthlyCost({ data: { year, month } }),
  });

// 年間全体のクエリオプション
const yearlyQueryOptions = (year: number) =>
  queryOptions({
    queryKey: ["yearly", "cost", year],
    queryFn: async () => {
      // 1-12月を並行して取得
      const promises = Array.from({ length: 12 }, (_, i) =>
        getMonthlyCost({ data: { year, month: i + 1 } }),
      );
      const results = await Promise.all(promises);

      // 月をキーとした Map に変換
      const monthlyData = new Map<
        number,
        Awaited<ReturnType<typeof getMonthlyCost>>
      >();
      results.forEach((data, index) => {
        monthlyData.set(index + 1, data);
      });

      return monthlyData;
    },
    staleTime: 10 * 60 * 1000,
  });

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Home,
  loaderDeps: ({ search: { year, month } }) => ({ year, month }),
  loader: ({ context, deps: { year, month } }) => {
    const now = new Date();
    const currentYear = year ?? now.getFullYear();
    const currentMonth = month ?? now.getMonth() + 1;
    context.queryClient.prefetchQuery(yearlyQueryOptions(currentYear));
    context.queryClient.prefetchQuery(
      deferredQueryOptions(currentYear, currentMonth),
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

function SkeletonDemo() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

function Home() {
  const { year, month } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [api, setApi] = useState<CarouselApi>();

  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentMonth = month ?? now.getMonth() + 1;

  // Carousel APIの設定
  useEffect(() => {
    if (!api) return;

    // 初期位置を設定（滑らかに）
    api.scrollTo(currentMonth - 1, false);

    api.on("select", () => {
      const selected = api.selectedScrollSnap();
      const newMonth = selected + 1; // 0ベースから1ベースに変換

      if (newMonth !== currentMonth) {
        navigate({
          to: "/",
          search: { year: currentYear, month: newMonth },
          replace: true,
        });
      }
    });
  }, [api, currentYear, currentMonth, navigate]);

  // URLが変更された時にスライドを対応する月に移動
  useEffect(() => {
    if (api) {
      const targetSlide = currentMonth - 1; // 0ベースに変換
      if (api.selectedScrollSnap() !== targetSlide) {
        api.scrollTo(targetSlide, true); // 滑らかなアニメーションを有効化
      }
    }
  }, [currentMonth, api]);

  return (
    <Suspense fallback={<SkeletonDemo />}>
      <YearlyCarousel
        year={currentYear}
        currentMonth={currentMonth}
        setApi={setApi}
      />
    </Suspense>
  );
}

function YearlyCarousel({
  year,
  currentMonth,
  setApi,
}: {
  year: number;
  currentMonth: number;
  setApi: (api: CarouselApi) => void;
}) {
  // 年間データを取得
  const yearlyQuery = useSuspenseQuery(yearlyQueryOptions(year));

  return (
    <Carousel setApi={setApi} className="max-w-4xl mx-auto">
      <CarouselContent>
        {Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const monthData = yearlyQuery.data.get(month);

          return (
            <CarouselItem key={month}>
              <div className="p-1">
                <MonthlyCostTable
                  year={year}
                  month={month}
                  data={monthData}
                  isActive={month === currentMonth}
                />
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex" />
      <CarouselNext className="hidden md:flex" />
    </Carousel>
  );
}

function MonthlyCostTable({
  year,
  month,
  data,
  isActive = true,
}: {
  year: number;
  month: number;
  data: Awaited<ReturnType<typeof getMonthlyCost>> | undefined;
  isActive?: boolean;
}) {
  if (!data || !data.userSummaries) {
    return (
      <div className="text-center py-8 text-gray-500">
        {month}月のデータがありません
      </div>
    );
  }

  const paymentsMap = new Map(
    data.userSummaries.map((user) => [user.user, user.totalAmount]),
  );
  const diffResult = paymentsMap.size === 2 ? calcDiff(paymentsMap) : null;

  return (
    <div
      className={`transition-opacity ${isActive ? "opacity-100" : "opacity-70"}`}
    >
      {diffResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{month}月 支払い金額</CardTitle>
            <CardDescription> （多い方 - 少ない方） / 2</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Price amount={diffResult.amount} />
            </div>
          </CardContent>
          <CardFooter>
            <div>
              <p className="text-sm text-gray-600 mb-1">From to</p>
              <span className="font-medium">
                {diffResult.from} → {diffResult.to}
              </span>
            </div>
          </CardFooter>
        </Card>
      )}
      <Table>
        <TableCaption>
          Monthly Cost - {year}年{month}月
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>User name</TableHead>
            <TableHead className="text-right">Total amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.userSummaries.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="font-medium">{user.user}</TableCell>
              <TableCell className="text-right">
                <Price amount={user.totalAmount} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
