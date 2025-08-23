// src/hooks/useQueryOptions.ts
import { queryOptions } from "@tanstack/react-query";
import { getMonthlyCost } from "@/server/getMonthly";

export const deferredQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["monthly", "cost", year, month],
    queryFn: () => getMonthlyCost({ data: { year, month } }),
  });

export const yearlyQueryOptions = (year: number) =>
  queryOptions({
    queryKey: ["yearly", "cost", year],
    queryFn: async () => {
      const promises = Array.from({ length: 12 }, (_, i) =>
        getMonthlyCost({ data: { year, month: i + 1 } })
      );
      const results = await Promise.all(promises);

      const monthlyData = new Map<
        number,
        Awaited<ReturnType<typeof getMonthlyCost>>
      >();
      results.forEach((data, index) => {
        monthlyData.set(index + 1, data);
      });

      return monthlyData;
    },
    staleTime: 10 * 60 * 1000,
  });
