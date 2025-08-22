import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMonthlyCost } from "@/server/getMonthly";
import { calcDiff } from "@/utils/calculations";
import { Price } from "./Price";
import { DetailDrawer } from "./DetailDrawer";

export function MonthlyCostTable({
  year,
  month,
  data,
  isActive = true,
}: {
  year: number;
  month: number;
  data: Awaited<ReturnType<typeof getMonthlyCost>> | undefined;
  isActive?: boolean;
}) {
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    user: string;
    totalAmount: number;
    transactionCount: number;
    categoryBreakdown: {
      [x: string]: {
        amount: number;
        memo: string;
      }[];
    };
  }>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!data || !data.userSummaries) {
    return (
      <div className="text-center py-8 text-gray-500">
        {month}月のデータがありません
      </div>
    );
  }

  const paymentsMap = new Map(
    data.userSummaries.map((user) => [user.user, user.totalAmount]),
  );
  const diffResult = paymentsMap.size === 2 ? calcDiff(paymentsMap) : null;

  const handleRowClick = (user: (typeof data.userSummaries)[0]) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  return (
    <div
      className={`transition-opacity ${isActive ? "opacity-100" : "opacity-70"}`}
    >
      {diffResult && (
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
                {diffResult.from} → {diffResult.to}
              </span>
            </div>
          </CardFooter>
        </Card>
      )}
      <Table>
        <TableCaption>
          Monthly Cost - {year}年{month}月
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>User name</TableHead>
            <TableHead className="text-right">Total amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.userSummaries.map((user) => (
            <TableRow
              key={user.userId}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleRowClick(user)}
            >
              <TableCell className="font-medium">{user.user}</TableCell>
              <TableCell className="text-right">
                <Price amount={user.totalAmount} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DetailDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        user={selectedUser}
      />
    </div>
  );
}