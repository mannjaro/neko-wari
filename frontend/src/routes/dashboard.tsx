// src/routes/dashboard.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { z } from "zod";
import { AuthGuard } from "@/components/AuthGuard";
import type { CarouselApi } from "@/components/ui/carousel";
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

// 環境に応じた設定
const CLIENT_ID = "52egt02nn47oubgatq6vadtgs4";
const COGNITO_DOMAIN =
  "https://payment-dashboard.auth.ap-northeast-1.amazoncognito.com";
const REDIRECT_URI = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://advanced-payment-dashboard.zk-****.workers.dev";

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  component: Dashboard,
  loaderDeps: ({ search: { year, month } }) => ({ year, month }),
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
  const [api, setApi] = useState<CarouselApi>();
  const initialSetRef = useRef(false);
  const auth = useAuth();

  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentMonth = month ?? now.getMonth() + 1;

  const setUpPasskey = () => {
    window.location.href = `${COGNITO_DOMAIN}/passkeys/add?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };

  const handleYearChange = (newYear: number) => {
    navigate({
      to: "/dashboard",
      search: { year: newYear, month: currentMonth },
      replace: true,
    });
  };

  // 未認証の場合はログインページへリダイレクト
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  // Carousel APIの設定
  useEffect(() => {
    if (!api || initialSetRef.current) return;

    // 初期位置を設定（滑らかに）
    api.scrollTo(currentMonth - 1, true);
    initialSetRef.current = true;

    api.on("select", () => {
      const selected = api.selectedScrollSnap();
      const newMonth = selected + 1; // 0ベースから1ベースに変換

      if (newMonth !== currentMonth) {
        navigate({
          to: "/dashboard",
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
        api.scrollTo(targetSlide, false); // 滑らかなアニメーションを有効化
      }
    }
  }, [currentMonth, api]);

  // ローディング中はスケルトンを表示
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <SkeletonDemo />
      </div>
    );
  }

  // 未認証の場合は何も表示しない（リダイレクト処理中）
  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <AuthGuard>
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
                  <UserControl setUpPasskey={setUpPasskey} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 年選択バー */}
        <YearSelector
          currentYear={currentYear}
          onYearChange={handleYearChange}
        />

        {/* メインコンテンツ */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={<SkeletonDemo />}>
            <YearlyCarousel
              year={currentYear}
              currentMonth={currentMonth}
              setApi={setApi}
            />
          </Suspense>
        </main>
      </div>
    </AuthGuard>
  );
}
