import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteCost } from "@/hooks/useDeleteCost";

interface DeleteDetailButtonProps {
  userId: string;
  timestamp: number;
  memo: string;
}

export function DeleteDetailButton({
  userId,
  timestamp,
  memo,
}: DeleteDetailButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCostDetail = useDeleteCost();

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteCostDetail({
        uid: userId,
        timestamp: String(timestamp),
      });
      toast.success("削除が完了しました");
      setOpen(false);
    } catch (error) {
      toast.error("削除に失敗しました");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteCostDetail, userId, timestamp]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>削除確認</DialogTitle>
          <DialogDescription>
            この項目を削除してもよろしいですか？
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            メモ: <span className="font-medium">{memo}</span>
          </p>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isDeleting}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
