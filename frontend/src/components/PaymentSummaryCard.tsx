import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiffAmount, UserSummary } from "@/types";
import { Price } from "./Price";

interface PaymentSummaryCardProps {
  month: number;
  diffResult: DiffAmount | null;
  userSummaries: UserSummary[];
}

export function PaymentSummaryCard({
  month,
  diffResult,
  userSummaries,
}: PaymentSummaryCardProps) {
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
        <CardTitle>{month}月 支払い金額</CardTitle>
        <CardDescription> （多い方 - 少ない方） / 2</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <Price amount={diffResult.amount} />
        </div>
      </CardContent>
      <CardFooter>
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
      </CardFooter>
    </Card>
  );
}
