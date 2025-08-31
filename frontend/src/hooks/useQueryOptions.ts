// src/hooks/useQueryOptions.ts
import { queryOptions } from "@tanstack/react-query";
import { getMonthlyCost } from "@/server/getMonthly";

export const deferredQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["monthly", "cost", year, month],
    queryFn: () => getMonthlyCost({ data: { year, month } }),
  });

export const monthlyQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["monthly", "cost", String(year), String(month).padStart(2, "0")],
    queryFn: () => getMonthlyCost({ data: { year, month } }),
  });
