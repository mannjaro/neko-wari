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

import { PenLine } from "lucide-react";

interface EditDetailDialogCloseButtonProps {
  timestamp?: number;
  category?: string;
  memo?: string;
  amount?: number;
}

export function EditDetailDialogCloseButton({
  timestamp,
  category,
  memo,
  amount,
}: EditDetailDialogCloseButtonProps = {}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PenLine />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>編集</DialogTitle>
          <DialogDescription>カテゴリ、金額、メモの修正</DialogDescription>
        </DialogHeader>
        <div>
          <span>{timestamp}</span>
          <span>{category}</span>
          <span>{memo}</span>
          <span>{amount}</span>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
