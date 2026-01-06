import { useState, useEffect } from "react";
import type { getMonthlyCost } from "@/server/getMonthly";
import type { UserSummary, SettlementStatusData } from "@/types";
import { calcDiff } from "@/utils/calculations";
import { AddDetailDialog } from "./AddDetailDialog";
import { DetailDrawer } from "./DetailDrawer";
import { PaymentSummaryCard } from "./PaymentSummaryCard";
import { UserSummaryTable } from "./UserSummaryTable";
import { getMonthlySettlements } from "@/server/getMonthlySettlements";
import { completeSettlement } from "@/server/completeSettlement";
import { useToast } from "@/hooks/use-toast";

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
  const [settlements, setSettlements] = useState<SettlementStatusData[]>([]);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const { toast } = useToast();

  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  // Load settlements when component mounts or month changes
  useEffect(() => {
    const loadSettlements = async () => {
      setIsLoadingSettlements(true);
      try {
        const result = await getMonthlySettlements({ data: { yearMonth } });
        setSettlements(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Failed to load settlements:", error);
        setSettlements([]);
      } finally {
        setIsLoadingSettlements(false);
      }
    };

    loadSettlements();
  }, [yearMonth]);

  if (!data || !data.userSummaries) {
    return (
      <div className="text-center py-8 text-gray-500">
        {month}月のデータがありません
      </div>
    );
  }

  const paymentsMap = new Map(
    data.userSummaries.map((user) => [user.userId, user.totalAmount]),
  );
  const diffResult = calcDiff(paymentsMap);

  const handleCompleteSettlement = async () => {
    if (!diffResult) return;

    try {
      // Mark the payer's settlement as complete
      await completeSettlement({
        data: {
          userId: diffResult.from,
          yearMonth,
          completedBy: diffResult.from,
        },
      });

      // Reload settlements
      const result = await getMonthlySettlements({ data: { yearMonth } });
      setSettlements(Array.isArray(result) ? result : []);

      toast({
        title: "精算完了",
        description: `${year}年${month}月の精算を完了しました。`,
      });
    } catch (error) {
      console.error("Failed to complete settlement:", error);
      toast({
        title: "エラー",
        description: "精算の完了に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
  };

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
      <PaymentSummaryCard
        month={month}
        year={year}
        diffResult={diffResult}
        userSummaries={data.userSummaries}
        settlements={settlements}
        onCompleteSettlement={handleCompleteSettlement}
      />
      <div className="flex justify-end mb-4">
        <AddDetailDialog />
      </div>
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
