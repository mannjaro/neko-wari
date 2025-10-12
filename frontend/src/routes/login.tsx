// src/routes/login.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const auth = useAuth();
  const navigate = useNavigate();

  // すでにログインしている場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [auth.isAuthenticated, navigate]);

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
      console.error("Error details:", {
        message: auth.error.message,
        name: auth.error.name,
      });
    }
  }, [auth.error]);

  // 認証状態のローディング中はスケルトンを表示
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
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
