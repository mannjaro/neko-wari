import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import { type CreateCostData, createCostDetail } from "@/server/createDetail";

export function useCreateCost() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createCost = useServerFn(createCostDetail);

  return useCallback(
    async (data: CreateCostData) => {
      const result = await createCost({ data });
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
    [router, queryClient, createCost],
  );
}
