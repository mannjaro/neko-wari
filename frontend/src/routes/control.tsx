// src/routes/control.tsx

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Lock,
} from "lucide-react";

// shadcn/ui components (パスはプロジェクト構成に合わせて調整してください)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- モックデータ ---
type UserStatus = "active" | "inactive" | "pending";
type UserRole = "admin" | "member" | "viewer";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

const usersData: User[] = [
  {
    id: "1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-03-10 10:23",
  },
  {
    id: "2",
    name: "鈴木 花子",
    email: "suzuki@example.com",
    role: "member",
    status: "active",
    lastLogin: "2024-03-09 14:45",
  },
  {
    id: "3",
    name: "佐藤 次郎",
    email: "sato@example.com",
    role: "viewer",
    status: "inactive",
    lastLogin: "2024-02-20 09:00",
  },
  {
    id: "4",
    name: "山田 健太",
    email: "yamada@example.com",
    role: "member",
    status: "pending",
    lastLogin: "-",
  },
  {
    id: "5",
    name: "高橋 美咲",
    email: "takahashi@example.com",
    role: "member",
    status: "active",
    lastLogin: "2024-03-11 09:15",
  },
];

export const Route = createFileRoute("/control")({
  component: Control,
});

function Control() {
  return (
    <div>
      <UserManagementPage />
    </div>
  );
}
function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // ステータスに応じたバッジの色定義
  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case "active":
        return "default"; // 黒 (shadcn標準) または緑系にカスタマイズ
      case "inactive":
        return "destructive"; // 赤
      case "pending":
        return "secondary"; // グレー
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case "active":
        return "有効";
      case "inactive":
        return "停止中";
      case "pending":
        return "招待中";
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
            <p className="text-muted-foreground">
              システム利用者の権限とステータスを管理します。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              新規ユーザー
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ユーザー一覧</CardTitle>
            <CardDescription>
              現在 {usersData.length} 名のユーザーが登録されています。
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* ツールバー */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="名前またはメールで検索..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="権限" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全ての権限</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="member">一般</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* テーブル */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">ユーザー</TableHead>
                    <TableHead>権限</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="hidden md:table-cell">
                      最終ログイン
                    </TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                              alt={user.name}
                            />
                            <AvatarFallback>
                              {user.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.role === "admin" && (
                            <Badge
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700"
                            >
                              管理者
                            </Badge>
                          )}
                          {user.role === "member" && (
                            <Badge variant="outline">一般</Badge>
                          )}
                          {user.role === "viewer" && (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              閲覧者
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {getStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {user.lastLogin}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニューを開く</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>アクション</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> 編集
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Lock className="mr-2 h-4 w-4" />{" "}
                              パスワードリセット
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> 削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
