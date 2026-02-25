// src/routes/dashboard.tsx

import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { YearlyCarousel } from "@/components/YearlyCarousel";
import { YearSelector } from "@/components/YearSelector";
import {
  deferredQueryOptions,
  monthlyQueryOptions,
} from "@/hooks/useQueryOptions";
import { UserControl } from "@/components/UserControl";

const searchSchema = z.object({
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  component: Dashboard,
  loaderDeps: ({ search: { year, month } }) => ({ year, month }),
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  loader: ({ context, deps: { year, month } }) => {
    const now = new Date();
    const currentYear = year ?? now.getFullYear();
    const currentMonth = month ?? now.getMonth() + 1;

    // Prefetch all 12 months for the current year
    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
      context.queryClient.prefetchQuery(
        monthlyQueryOptions(currentYear, monthIndex),
      );
    }

    // 年跨ぎスクロール用に前年12月・翌年1月もprefetch（2025年以前はAPIが対応していないのでスキップ）
    if (currentYear - 1 >= 2025) {
      context.queryClient.prefetchQuery(
        monthlyQueryOptions(currentYear - 1, 12),
      );
    }
    context.queryClient.prefetchQuery(
      monthlyQueryOptions(currentYear + 1, 1),
    );

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

function Dashboard() {
  const { year, month } = Route.useSearch();
  const navigate = useNavigate();

  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentMonth = month ?? now.getMonth() + 1;

  const handleYearChange = (newYear: number) => {
    navigate({
      to: "/dashboard",
      search: { year: newYear, month: currentMonth },
      replace: true,
    });
  };

  // カルーセルのスクロールで月/年が変わった時のコールバック
  const handleMonthChange = useCallback(
    (newYear: number, newMonth: number) => {
      navigate({
        to: "/dashboard",
        search: { year: newYear, month: newMonth },
        replace: true,
      });
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ユーザー情報ヘッダ */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                支払い管理ボード
              </h1>
            </div>

            <div className="flex items-center">
              {/* ユーザー情報 & メニュー */}
              <div className="flex items-center space-x-3">
                <UserControl />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 年選択バー */}
      <YearSelector currentYear={currentYear} onYearChange={handleYearChange} />

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<SkeletonDemo />}>
          <YearlyCarousel
            key={currentYear}
            year={currentYear}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
          />
        </Suspense>
      </main>
    </div>
  );
}
