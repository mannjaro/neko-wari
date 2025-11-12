// src/routes/dashboard.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { z } from "zod";
import { AddDetailDialog } from "@/components/AddDetailDialog";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import type { CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { YearlyCarousel } from "@/components/YearlyCarousel";
import {
  deferredQueryOptions,
  monthlyQueryOptions,
} from "@/hooks/useQueryOptions";

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

              <div className="flex items-center space-x-4">
                {/* ユーザー情報 */}
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                    {auth.user?.profile?.email?.[0]?.toUpperCase() ||
                      auth.user?.profile?.name?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                  <div className="hidden sm:block text-sm">
                    <p className="font-medium text-gray-900">
                      {auth.user?.profile?.name ||
                        auth.user?.profile?.email ||
                        "ユーザー"}
                    </p>
                    {auth.user?.profile?.email && auth.user?.profile?.name && (
                      <p className="text-gray-500">{auth.user.profile.email}</p>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center space-x-2">
                  {/* デスクトップ用の追加ボタン */}
                  <div className="hidden sm:block">
                    <AddDetailDialog isMobile={false} />
                  </div>

                  <Button
                    type="button"
                    onClick={() => setUpPasskey()}
                    variant="outline"
                    size="sm"
                  >
                    <svg
                      className="h-4 w-4 sm:mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Passkey設定</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => auth.removeUser()}
                    variant="ghost"
                    size="sm"
                  >
                    <svg
                      className="h-4 w-4 sm:mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="hidden sm:inline">ログアウト</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

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

        {/* モバイル用の右下FABボタン */}
        <div className="sm:hidden">
          <AddDetailDialog isMobile={true} />
        </div>
      </div>
    </AuthGuard>
  );
}
