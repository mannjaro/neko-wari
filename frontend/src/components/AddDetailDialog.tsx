import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCost } from "@/hooks/useCreateCost";
import { CreateCostDataSchema, PaymentCategorySchema } from "@/types/shared";
import { getCategoryName } from "@/utils/categoryNames";
import { YenInput } from "./YenInput";

function SubmitForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<z.infer<typeof CreateCostDataSchema>>({
    resolver: zodResolver(CreateCostDataSchema),
    defaultValues: {
      userId: "",
      category: "other",
      memo: "",
      price: 0,
    },
  });

  const createCostDetail = useCreateCost();

  const onSubmit = useCallback(
    async (data: z.infer<typeof CreateCostDataSchema>) => {
      try {
        const result = await createCostDetail(data);
        toast("新しい項目が追加されました", {});
        console.log(result);
        form.reset();
        onSuccess?.();
        return result;
      } catch (error) {
        toast.error("エラーが発生しました");
        console.error(error);
      }
    },
    [createCostDetail, onSuccess, form],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー</FormLabel>
              <FormControl>
                <Input placeholder="ユーザー名を入力" {...field} />
              </FormControl>
              <FormDescription>
                支払いをしたユーザーを入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PaymentCategorySchema.options.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
                <FormDescription>カテゴリを選択してください</FormDescription>
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
                <Input placeholder="備考を入力" {...field} />
              </FormControl>
              <FormDescription>備考を入力してください</FormDescription>
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
              <FormDescription>金額を入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          追加する
        </Button>
      </form>
    </Form>
  );
}

export function AddDetailDialog() {
  const [open, setOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="h-4 w-4 mr-2" />
          新規追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しい項目を追加</DialogTitle>
          <DialogDescription>
            カテゴリ、備考、金額、ユーザーを入力してください
          </DialogDescription>
        </DialogHeader>
        <div>
          <SubmitForm onSuccess={handleSuccess} />
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              キャンセル
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
