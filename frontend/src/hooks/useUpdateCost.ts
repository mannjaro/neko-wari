import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  updateCostDetail,
  type ExtendedUpdateCostData,
} from "@/server/updateDetail";

export function useUpdateCost() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const updateCost = useServerFn(updateCostDetail);

  return useCallback(
    async (data: ExtendedUpdateCostData) => {
      const result = await updateCost({ data });
      const { YearMonth } = result;
      const [year, month] = YearMonth.split("-");
      router.invalidate();
      if (year && month) {
        queryClient.invalidateQueries({
          queryKey: ["monthly", "cost", year, month],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ["monthly", "cost"],
        });
      }
      return result;
    },
    [router, queryClient, updateCost]
  );
}
