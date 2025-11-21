import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Search,
  Download,
  Trash2,
  Lock,
  Loader2,
} from "lucide-react";
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
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import { EditDisplayNameDialog } from "./EditDisplayNameDialog";
import { listUsers } from "@/server/listUsers";
import type { User } from "./types";

export function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });

  const users: User[] = data?.users || [];

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lineUserId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex w-full bg-muted/40">
      <main className="flex flex-1 flex-col p-4 md:p-8 overflow-x-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ユーザー一覧</CardTitle>
            <CardDescription>
              現在 {users.length} 名のユーザーが登録されています。
            </CardDescription>
            <div className="flex items-center gap-2">
              <CreateInvitationDialog />
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                エクスポート
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="名前またはIDで検索..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-destructive font-medium">
                  ユーザーの読み込みに失敗しました
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            )}

            {!isLoading && !error && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">ユーザー</TableHead>
                      <TableHead>権限</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="hidden md:table-cell">
                        登録日時
                      </TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <p className="text-muted-foreground">
                            {searchTerm
                              ? "検索条件に一致するユーザーが見つかりません"
                              : "登録されているユーザーがいません"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                {user.pictureUrl ? (
                                  <AvatarImage
                                    src={user.pictureUrl}
                                    alt={user.displayName}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    {user.displayName.slice(0, 2)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {user.displayName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.lineUserId}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">一般</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">有効</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {new Date(user.acceptedAt).toLocaleString("ja-JP")}
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
                                  <span className="sr-only">
                                    メニューを開く
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                  アクション
                                </DropdownMenuLabel>
                                <EditDisplayNameDialog user={user} />
                                <DropdownMenuItem>
                                  <Lock className="mr-2 h-4 w-4" /> 権限変更
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> 削除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
