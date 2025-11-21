import { useState } from "react";
import { toast } from "sonner";
import { Edit, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { updateDisplayName } from "@/server/updateDisplayName";
import type { User } from "./types";

interface Props {
  user: User;
}

export function EditDisplayNameDialog({ user }: Props) {
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
