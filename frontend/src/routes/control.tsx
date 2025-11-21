import { createFileRoute, redirect } from "@tanstack/react-router";
import { UserManagementPage } from "@/components/control/UserManagementPage";
import { UserControl } from "@/components/UserControl";

export const Route = createFileRoute("/control")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: Control,
});

function Control() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="flex p-4 md:p-8 items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
          {/* ユーザー情報 & メニュー */}
          <div className="flex items-center space-x-3">
            <UserControl />
          </div>
        </div>
      </header>
      <UserManagementPage />
    </div>
  );
}

// コンポーネントは分離され `@/components/control` 下に配置
