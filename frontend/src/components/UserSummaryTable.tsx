import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getMonthlyCost } from "@/server/getMonthly";
import { Price } from "./Price";

interface UserSummaryTableProps {
  year: number;
  month: number;
  userSummaries: Awaited<ReturnType<typeof getMonthlyCost>>["userSummaries"];
  onRowClick: (
    user: Awaited<ReturnType<typeof getMonthlyCost>>["userSummaries"][0],
  ) => void;
}

export function UserSummaryTable({
  year,
  month,
  userSummaries,
  onRowClick,
}: UserSummaryTableProps) {
  return (
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
        {userSummaries.map((user) => (
          <TableRow
            key={user.userId}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onRowClick(user)}
          >
            <TableCell className="font-medium">{user.user}</TableCell>
            <TableCell className="text-right">
              <Price amount={user.totalAmount} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
