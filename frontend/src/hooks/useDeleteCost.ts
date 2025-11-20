import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import { type DeleteCostData, deleteCostDetail } from "@/server/deleteDetail";

export function useDeleteCost() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteCost = useServerFn(deleteCostDetail);

  return useCallback(
    async (data: DeleteCostData) => {
      const result = await deleteCost({ data });
      // Invalidate all monthly cost queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["monthly", "cost"],
      });
      router.invalidate();
      return result;
    },
    [router, queryClient, deleteCost],
  );
}
