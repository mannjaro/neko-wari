// src/routes/index.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { YearlyCarousel } from "@/components/YearlyCarousel";
import { authQueryKey } from "@/hooks/useAuth";
import type { AuthTokens } from "@/types/auth";
import {
  deferredQueryOptions,
  monthlyQueryOptions,
} from "@/hooks/useQueryOptions";

const searchSchema = z.object({
  year: z.number().optional(),
  month: z.number().min(1).max(12).optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    const auth = context.queryClient.getQueryData<AuthTokens>(authQueryKey);
    console.log(auth);
    if (!auth?.accessToken) {
      throw redirect({ to: "/login" });
    }
  },
  component: Home,
  loaderDeps: ({ search: { year, month } }) => ({ year, month }),
  loader: ({ context, deps: { year, month } }) => {
    const now = new Date();
    const currentYear = year ?? now.getFullYear();
    const currentMonth = month ?? now.getMonth() + 1;

    // Prefetch all 12 months for the current year
    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
      context.queryClient.prefetchQuery(
        monthlyQueryOptions(currentYear, monthIndex),
      );
    }

    context.queryClient.prefetchQuery(
      deferredQueryOptions(currentYear, currentMonth),
    );
  },
  errorComponent: () => (
    <div>
      <p>error</p>
    </div>
  ),
});

function SkeletonDemo() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

function Home() {
  const { year, month } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const initialSetRef = useRef(false);

  const now = new Date();
  const currentYear = year ?? now.getFullYear();
  const currentMonth = month ?? now.getMonth() + 1;

  // Carousel APIの設定
  useEffect(() => {
    if (!api || initialSetRef.current) return;

    // 初期位置を設定（滑らかに）
    api.scrollTo(currentMonth - 1, true);
    initialSetRef.current = true;

    api.on("select", () => {
      const selected = api.selectedScrollSnap();
      const newMonth = selected + 1; // 0ベースから1ベースに変換

      if (newMonth !== currentMonth) {
        navigate({
          to: "/dashboard",
          search: { year: currentYear, month: newMonth },
          replace: true,
        });
      }
    });
  }, [api, currentYear, currentMonth, navigate]);

  // URLが変更された時にスライドを対応する月に移動
  useEffect(() => {
    if (api) {
      const targetSlide = currentMonth - 1; // 0ベースに変換
      if (api.selectedScrollSnap() !== targetSlide) {
        api.scrollTo(targetSlide, false); // 滑らかなアニメーションを有効化
      }
    }
  }, [currentMonth, api]);

  return (
    <Suspense fallback={<SkeletonDemo />}>
      <YearlyCarousel
        year={currentYear}
        currentMonth={currentMonth}
        setApi={setApi}
      />
    </Suspense>
  );
}
