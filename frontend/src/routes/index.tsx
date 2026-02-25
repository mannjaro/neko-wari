// src/routes/index.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppAuth } from "@/features/auth";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const auth = useAppAuth();

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
