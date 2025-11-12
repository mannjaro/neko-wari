import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { useAuth } from "react-oidc-context";

import {
  type DeleteCostData,
  deleteCostDetail,
} from "@/server/deleteDetail";

export function useDeleteCost() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteCost = useServerFn(deleteCostDetail);
  const auth = useAuth();

  return useCallback(
    async (data: DeleteCostData) => {
      // Get the access token from the authenticated user
      const accessToken = auth.user?.access_token;
      if (!accessToken) {
        throw new Error("User is not authenticated");
      }

      const result = await deleteCost({ data, accessToken });
      // Invalidate all monthly cost queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ["monthly", "cost"],
      });
      router.invalidate();
      return result;
    },
    [router, queryClient, deleteCost, auth.user?.access_token],
  );
}
