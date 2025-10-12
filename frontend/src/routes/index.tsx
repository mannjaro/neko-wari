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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左側: 情報パネル */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-blue-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-12">
            <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Payment Dashboard</h1>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                支払い情報を
                <br />
                スマートに管理
              </h2>
              <p className="text-indigo-100 text-lg">
                シンプルで直感的なダッシュボードで、
                <br />
                あなたの支払い状況を一目で把握
              </p>
            </div>

            <div className="space-y-6 pt-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    月次・年次の自動集計
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    支払いデータを自動で集計し、わかりやすく表示します
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    安全な認証システム
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    Passkeyに対応した最新の認証技術で安心
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    リアルタイム更新
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    データはリアルタイムで反映され、常に最新の状態を確認できます
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-indigo-200 text-sm">
          © 2025 Payment Dashboard. All rights reserved.
        </div>
      </div>

      {/* 右側: ログインフォーム */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* モバイル用ヘッダー */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-lg bg-indigo-600 items-center justify-center mb-4">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Dashboard
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ようこそ
              </h2>
              <p className="text-gray-600">
                続けるにはアカウントにサインインしてください
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <Button
                type="button"
                onClick={() => auth.signinRedirect()}
                className="w-full h-12 text-base font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                サインイン
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    セキュリティについて
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <svg
                    className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      暗号化された通信
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      すべての通信は暗号化されて保護されています
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      多要素認証対応
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Passkeyによる安全な認証をサポート
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            サインインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}
