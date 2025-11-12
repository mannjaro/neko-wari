import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { useAuth } from "react-oidc-context";

import { type CreateCostData, createCostDetail } from "@/server/createDetail";

export function useCreateCost() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createCost = useServerFn(createCostDetail);
  const auth = useAuth();

  return useCallback(
    async (data: CreateCostData) => {
      // Get the access token from the authenticated user
      const accessToken = auth.user?.access_token;
      if (!accessToken) {
        throw new Error("User is not authenticated");
      }

      const result = await createCost({ data, accessToken });
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
    [router, queryClient, createCost, auth.user?.access_token],
  );
}
