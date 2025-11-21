import { useState } from "react";
import { toast } from "sonner";
import { Link, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createInvitation } from "@/server/createInvitation";

export function CreateInvitationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createInvitation({
        data: {
          createdBy: "admin-user", // TODO: 実際のユーザーIDに置換
          expirationHours: 168, // 7日
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
            新しいユーザーを招待するための一時的なURLを生成します。このURLは7日間有効です。
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
