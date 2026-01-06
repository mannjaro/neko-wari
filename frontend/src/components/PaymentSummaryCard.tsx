import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { DiffAmount, UserSummary, SettlementStatusData } from "@/types";
import { Price } from "./Price";
import { CheckCircle2 } from "lucide-react";

interface PaymentSummaryCardProps {
  month: number;
  year: number;
  diffResult: DiffAmount | null;
  userSummaries: UserSummary[];
  settlements: SettlementStatusData[];
  onCompleteSettlement?: () => void;
}

export function PaymentSummaryCard({
  month,
  year,
  diffResult,
  userSummaries,
  settlements,
  onCompleteSettlement,
}: PaymentSummaryCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  // Check if settlement is completed for the payer
  const payerSettlement = diffResult
    ? settlements.find((s) => s.userId === diffResult.from)
    : null;
  const isCompleted = payerSettlement?.status === "completed";

  const handleComplete = async () => {
    if (!diffResult || !onCompleteSettlement) return;

    setIsCompleting(true);
    try {
      await onCompleteSettlement();
    } finally {
      setIsCompleting(false);
    }
  };

  if (!diffResult) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{month}月 支払い金額</CardTitle>
          <CardDescription>データがありません</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-500">
            <Price amount={0} />
          </div>
        </CardContent>
        <CardFooter>
          <div>
            <p className="text-sm text-gray-600 mb-1">差額</p>
            <span className="font-medium text-gray-500">なし</span>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{month}月 支払い金額</span>
          {isCompleted && (
            <span className="flex items-center gap-1 text-sm font-normal text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              精算完了
            </span>
          )}
        </CardTitle>
        <CardDescription> （多い方 - 少ない方） / 2</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <Price amount={diffResult.amount} />
        </div>
        {isCompleted && payerSettlement?.completedAt && (
          <p className="text-sm text-gray-600 mt-2">
            完了日:{" "}
            {new Date(payerSettlement.completedAt).toLocaleDateString("ja-JP")}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 mb-1">From to</p>
          <span className="font-medium">
            {userSummaries.find((u) => u.userId === diffResult.from)
              ?.userName || diffResult.from}{" "}
            →{" "}
            {userSummaries.find((u) => u.userId === diffResult.to)?.userName ||
              diffResult.to}
          </span>
        </div>
        {!isCompleted && onCompleteSettlement && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={isCompleting}>
                {isCompleting ? "処理中..." : "精算完了"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>精算を完了しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  {year}年{month}月の精算を完了としてマークします。
                  <br />
                  支払い済みの場合のみ、完了してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>
                  完了する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
