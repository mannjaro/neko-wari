// src/routes/index.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const auth = useAuth();

  // ログイン済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate({ to: "/dashboard" });
    } else if (!auth.isLoading) {
      // 未ログインの場合はログインページへリダイレクト
      navigate({ to: "/login" });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  // リダイレクト処理中は何も表示しない
  return null;
}
