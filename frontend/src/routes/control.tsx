import { createFileRoute, redirect } from "@tanstack/react-router";
import { UserManagementPage } from "@/components/control/UserManagementPage";
import { UserControl } from "@/components/UserControl";
import { CLIENT_ID, COGNITO_DOMAIN, REDIRECT_URI } from "@/utils/auth";

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
  const setUpPasskey = () => {
    window.location.href = `${COGNITO_DOMAIN}/passkeys/add?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="flex p-4 md:p-8 items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
          {/* ユーザー情報 & メニュー */}
          <div className="flex items-center space-x-3">
            <UserControl setUpPasskey={setUpPasskey} />
          </div>
        </div>
      </header>
      <UserManagementPage />
    </div>
  );
}

// コンポーネントは分離され `@/components/control` 下に配置
