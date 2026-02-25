import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppAuth } from "@/features/auth";
import { Key, LogOut, UserCog, Home } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { CLIENT_ID, COGNITO_DOMAIN, REDIRECT_URI } from "@/utils/auth";

export function UserControl() {
  const auth = useAppAuth();
  const navigate = useNavigate();
  const setUpPasskey = () => {
    window.location.href = `${COGNITO_DOMAIN}/passkeys/add?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-full">
          <button
            type="button"
            className="h-10 w-10 justify-center cursor-pointer rounded-full bg-indigo-100 text-indigo-600 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {auth.user?.profile?.email?.[0]?.toUpperCase() ||
              auth.user?.profile?.name?.[0]?.toUpperCase() ||
              "U"}
          </button>
          <p className="text-xs leading-none text-muted-foreground sm:block hidden hover:bg-gray-100 px-2 py-1 rounded-sm">
            {auth.user?.profile?.email}
          </p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {auth.user?.profile?.name || "ユーザー"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {auth.user?.profile?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
          <Home />
          ホーム
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setUpPasskey()}>
          <Key />
          Passkey設定
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigate({
              to: "/control",
            })
          }
        >
          <UserCog />
          ユーザー設定
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => auth.removeUser()}>
          <LogOut />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
