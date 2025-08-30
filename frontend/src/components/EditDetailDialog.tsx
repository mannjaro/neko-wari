import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { YenInput } from "./YenInput";

import { PenLine } from "lucide-react";

import { ExtendedUpdateCostDataSchema } from "@/server/updateDetail";

function SubmitForm({
  amount,
  category,
  memo,
  timestamp,
}: EditDetailDialogCloseButtonProps) {
  // TODO: Implement form submission logic
  const form = useForm<z.infer<typeof ExtendedUpdateCostDataSchema>>({
    resolver: zodResolver(ExtendedUpdateCostDataSchema),
  });

  function onSubmit(data: z.infer<typeof ExtendedUpdateCostDataSchema>) {
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ</FormLabel>
              <FormControl>
                <Input {...field} defaultValue={category} />
              </FormControl>
              <FormDescription>カテゴリを入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ</FormLabel>
              <FormControl>
                <Input {...field} defaultValue={memo} />
              </FormControl>
              <FormDescription>メモを入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>価格</FormLabel>
              <FormControl>
                <YenInput step="1" {...field} defaultValue={amount} />
              </FormControl>
              <FormDescription>価格を入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

interface EditDetailDialogCloseButtonProps {
  timestamp: number;
  category: string;
  memo: string;
  amount: number;
}

export function EditDetailDialogCloseButton({
  timestamp,
  category,
  memo,
  amount,
}: EditDetailDialogCloseButtonProps) {
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
          <SubmitForm
            category={category}
            amount={amount}
            memo={memo}
            timestamp={timestamp}
          />
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
