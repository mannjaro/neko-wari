import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  MoreHorizontal,
  Search,
  Download,
  Trash2,
  Edit,
  Lock,
  Link,
  Copy,
  Loader2,
} from "lucide-react";

// shadcn/ui components (パスはプロジェクト構成に合わせて調整してください)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { createInvitation } from "../server/createInvitation";
import { listUsers } from "../server/listUsers";
import { updateDisplayName } from "../server/updateDisplayName";

// --- User interface ---
interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  acceptedAt: string;
  invitationId: string;
  createdBy: string;
}

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

function CreateInvitationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      // TODO: 実際のユーザーIDを使用する
      const result = await createInvitation({
        data: {
          createdBy: "admin-user", // 仮のID
          expirationHours: 168, // 7日間
        },
      });
      setInvitationUrl(result.invitationUrl);
      setExpiration(new Date(result.expiresAt).toLocaleString());
      toast.success("招待URLを作成しました");
    } catch (error) {
      console.error("Failed to create invitation:", error);
      toast.error("招待URLの作成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (invitationUrl) {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success("URLをコピーしました");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // ダイアログが完全に閉じた後にリセット
    setTimeout(() => {
      setInvitationUrl(null);
      setExpiration(null);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="mr-2 h-4 w-4" />
          招待URL作成
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>招待URLの作成</DialogTitle>
          <DialogDescription>
            新しいユーザーを招待するための一時的なURLを生成します。
            このURLは7日間有効です。
          </DialogDescription>
        </DialogHeader>

        {!invitationUrl ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              「作成」ボタンをクリックすると、一意の招待URLが生成されます。
              このURLを招待したいユーザーに共有してください。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <Input id="link" defaultValue={invitationUrl} readOnly />
              </div>
              <Button
                type="submit"
                size="sm"
                className="px-3"
                onClick={handleCopy}
              >
                <span className="sr-only">Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              有効期限: {expiration}
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          {!invitationUrl ? (
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={handleClose}>
              閉じる
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDisplayNameDialog({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { lineUserId: string; displayName: string }) =>
      await updateDisplayName({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("表示名を更新しました");
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`表示名の更新に失敗しました: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("表示名を入力してください");
      return;
    }
    mutation.mutate({
      lineUserId: user.lineUserId,
      displayName: displayName.trim(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="mr-2 h-4 w-4" /> 表示名を変更
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>表示名の変更</DialogTitle>
          <DialogDescription>
            {user.displayName} の表示名を変更します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">新しい表示名</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={mutation.isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch real user data
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });

  const users = data?.users || [];

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lineUserId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
            <CreateInvitationDialog />
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ユーザー一覧</CardTitle>
            <CardDescription>
              現在 {users.length} 名のユーザーが登録されています。
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
                    placeholder="名前またはIDで検索..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error state */}
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

            {/* Table */}
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
