import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import {
  type ExtendedUpdateCostData,
  updateCostDetail,
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
      if (year && month) {
        console.log(year, month);
        queryClient.invalidateQueries({
          queryKey: ["monthly", "cost", year, month],
        });
      } else {
        router.invalidate();
        queryClient.invalidateQueries({
          queryKey: ["monthly", "cost"],
        });
      }
      return result;
    },
    [router, queryClient, updateCost],
  );
}
