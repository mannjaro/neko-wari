import { createFileRoute } from "@tanstack/react-router";
import { UserManagementPage } from "@/components/control/UserManagementPage";
import { UserControl } from "@/components/UserControl";

export const Route = createFileRoute("/control")({
  component: Control,
});

const CLIENT_ID = "52egt02nn47oubgatq6vadtgs4";
const COGNITO_DOMAIN =
  "https://payment-dashboard.auth.ap-northeast-1.amazoncognito.com";
const REDIRECT_URI = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://advanced-payment-dashboard.zk-****.workers.dev";

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
