// src/routes/index.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { YearlyCarousel } from "@/components/YearlyCarousel";
import {
  deferredQueryOptions,
  monthlyQueryOptions,
} from "@/hooks/useQueryOptions";
import { useAuth } from "react-oidc-context";

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

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Home,
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

function Home() {
  const { year, month } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const initialSetRef = useRef(false);
  const auth = useAuth();

  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentMonth = month ?? now.getMonth() + 1;

  const signOutRedirect = () => {
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };

  const setUpPasskey = () => {
    window.location.href = `${COGNITO_DOMAIN}/passkeys/add?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };

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
        api.scrollTo(targetSlide, false); // 滑らかなアニメーションを有効化
      }
    }
  }, [currentMonth, api]);

  // 認証コールバックの自動処理（初回ログイン時）
  useEffect(() => {
    // URLにcodeパラメータがある場合、認証コールバック処理中
    const hasAuthParams = new URLSearchParams(window.location.search).has(
      "code",
    );
    if (hasAuthParams && !auth.isLoading && !auth.isAuthenticated) {
      console.log("Processing authentication callback...");
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  // 認証エラーのハンドリング
  useEffect(() => {
    if (auth.error) {
      console.error("Authentication error:", auth.error);
      // エラーの詳細をログ出力
      console.error("Error details:", {
        message: auth.error.message,
        name: auth.error.name,
      });
    }
  }, [auth.error]);

  // 認証状態のローディング中、またはコールバック処理中はスケルトンを表示
  const hasAuthParams =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("code");
  if (auth.isLoading || hasAuthParams) {
    return <SkeletonDemo />;
  }

  // エラー表示
  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">認証エラー</h1>
            <p className="mt-2 text-sm text-gray-600">{auth.error.message}</p>
            {auth.error.name && (
              <p className="mt-1 text-xs text-gray-500">
                エラータイプ: {auth.error.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              onClick={() => {
                // エラー状態をクリアしてから再度サインイン
                auth.clearStaleState();
                auth.signinRedirect();
              }}
              className="w-full"
            >
              再度サインイン
            </Button>
            <Button
              type="button"
              onClick={() => {
                // localStorageをクリアして最初からやり直し
                localStorage.clear();
                window.location.reload();
              }}
              variant="outline"
              className="w-full"
            >
              ストレージをクリアして再読み込み
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ユーザー情報ヘッダ */}
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  支払い管理ダッシュボード
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
                  <Button
                    type="button"
                    onClick={() => setUpPasskey()}
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
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
                    Passkey設定
                  </Button>

                  <Button
                    type="button"
                    onClick={() => auth.removeUser()}
                    variant="ghost"
                    size="sm"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
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
                    ログアウト
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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            支払い管理ダッシュボード
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            サインインして支払い情報を管理
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            type="button"
            onClick={() => auth.signinRedirect()}
            className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-105"
            size="lg"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            サインイン
          </Button>

          <div className="text-center text-xs text-gray-500">
            安全な認証でログインします
          </div>
        </div>
      </div>
    </div>
  );
}
