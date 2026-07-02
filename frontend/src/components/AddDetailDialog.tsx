import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { useAuth } from "react-oidc-context";
import { listUsers } from "@/server/listUsers";

type FormValues = z.infer<typeof CreateCostDataSchema>;

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getDefaultDateForMonth(year: number, month: number): string {
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  if (isCurrentMonth) {
    return formatDateInput(today);
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function SubmitForm({
  onSuccess,
  year,
  month,
}: {
  onSuccess?: () => void;
  year: number;
  month: number;
}) {
  const auth = useAuth();
  const username = (auth.user?.profile.username as string)?.split("_")[1] ?? "";
  const lineUserId = username.charAt(0).toUpperCase() + username.slice(1);
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCostDataSchema),
    defaultValues: {
      userId: lineUserId,
      displayName: "",
      category: "other",
      memo: "",
      price: 0,
      costType: "split",
    },
  });
  const [dateValue, setDateValue] = useState(() =>
    getDefaultDateForMonth(year, month),
  );

  const createCostDetail = useCreateCost();

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });

  useEffect(() => {
    const users = usersData?.users || [];
    const currentUser = users.find((u) => u.id === lineUserId);
    if (currentUser) {
      form.setValue("displayName", currentUser.displayName);
    }
  }, [usersData, lineUserId, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const timestamp = new Date(`${dateValue}T12:00:00Z`).getTime();
      const result = await createCostDetail({ ...data, timestamp });
      toast("新しい項目が追加されました", {});
      console.log(result);
      form.reset();
      setDateValue(getDefaultDateForMonth(year, month));
      onSuccess?.();
      return result;
    } catch (error) {
      toast.error("エラーが発生しました");
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormItem>
          <FormLabel htmlFor="cost-date">日付</FormLabel>
          <FormControl>
            <Input
              id="cost-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </FormControl>
          <FormDescription>
            過去の月の項目もこの日付を変更することで登録できます
          </FormDescription>
        </FormItem>
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
          name="costType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>種別</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="種別を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="split">折半</SelectItem>
                  <SelectItem value="charge">請求</SelectItem>
                </SelectContent>
                <FormDescription>折半: 2人で割り勘 / 請求: 全額を相手に請求</FormDescription>
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

export function AddDetailDialog({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [open, setOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          新規追加
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新しい項目を追加</DialogTitle>
          <DialogDescription>
            カテゴリ、備考、金額を入力してください
          </DialogDescription>
        </DialogHeader>
        <div>
          <SubmitForm onSuccess={handleSuccess} year={year} month={month} />
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
