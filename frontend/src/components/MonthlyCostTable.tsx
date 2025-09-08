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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>();

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
  const diffResult = calcDiff(paymentsMap);

  const handleRowClick = (user: UserSummary) => {
    setSelectedUserId(user.userId);
    setIsDrawerOpen(true);
  };
  const currentUser = data.userSummaries.find(
    (u) => u.userId === selectedUserId,
  );

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
        user={currentUser}
      />
    </div>
  );
}
