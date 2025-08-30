import { useState } from "react";
import { calcDiff } from "@/utils/calculations";
import { DetailDrawer } from "./DetailDrawer";
import { PaymentSummaryCard } from "./PaymentSummaryCard";
import { UserSummaryTable } from "./UserSummaryTable";
import type { getMonthlyCost } from "@/server/getMonthly";
import type { UserSummary } from "@/types";

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
  const [selectedUser, setSelectedUser] = useState<UserSummary>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!data || !data.userSummaries) {
    return (
      <div className="text-center py-8 text-gray-500">
        {month}月のデータがありません
      </div>
    );
  }

  const paymentsMap = new Map(
    data.userSummaries.map((user) => [user.userName, user.totalAmount]),
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
        <PaymentSummaryCard month={month} diffResult={diffResult} />
      )}
      <UserSummaryTable
        year={year}
        month={month}
        userSummaries={data.userSummaries}
        onRowClick={handleRowClick}
      />
      <DetailDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        user={selectedUser}
      />
    </div>
  );
}
