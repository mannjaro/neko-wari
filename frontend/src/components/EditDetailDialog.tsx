import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { YenInput } from "./YenInput";
import { PenLine } from "lucide-react";

import { ExtendedUpdateCostDataSchema } from "@/server/updateDetail";

import { useUpdateCost } from "@/hooks/useUpdateCost";

import type { PaymentCategory } from "@/types/shared";
import { PaymentCategorySchema } from "@/types/shared";
import { useCallback } from "react";

function SubmitForm({
  userId,
  amount,
  category,
  memo,
  timestamp,
}: EditDetailDialogCloseButtonProps) {
  const form = useForm<z.infer<typeof ExtendedUpdateCostDataSchema>>({
    resolver: zodResolver(ExtendedUpdateCostDataSchema),
    defaultValues: {
      category,
      memo,
      price: amount,
      uid: userId, // TODO: Get actual user ID
      updatedAt: new Date().toISOString(),
      timestamp: String(timestamp),
    },
  });

  const updateCostDetail = useUpdateCost();

  const onSubmit = useCallback(
    async (data: z.infer<typeof ExtendedUpdateCostDataSchema>) => {
      const result = await updateCostDetail(data);
      console.log(result);
      return result;
    },
    [updateCostDetail],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified email to display" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PaymentCategorySchema.options.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
                <FormDescription>カテゴリを入力してください</FormDescription>
                <FormMessage />
              </Select>
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
                <Input {...field} />
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
                <YenInput step="1" {...field} />
              </FormControl>
              <FormDescription>価格を入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

interface EditDetailDialogCloseButtonProps {
  userId: string;
  timestamp: number;
  category: PaymentCategory;
  memo: string;
  amount: number;
}

export function EditDetailDialogCloseButton({
  userId,
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
            userId={userId}
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
