import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "react-oidc-context";

export function UserControl({ setUpPasskey }: { setUpPasskey: () => void }) {
  const auth = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-full">
        <button className="h-10 w-10 justify-center cursor-pointer rounded-full bg-indigo-100 text-indigo-600 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
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
        <DropdownMenuItem onClick={() => setUpPasskey()}>
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
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => auth.removeUser()}>
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
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
