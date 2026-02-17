import { useEffect, useMemo, useRef, useState } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { monthlyQueryOptions } from "@/hooks/useQueryOptions";
import { MonthlyCostTable } from "./MonthlyCostTable";

export function YearlyCarousel({
  year,
  currentMonth,
  onMonthChange,
}: {
  year: number;
  currentMonth: number;
  onMonthChange: (year: number, month: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();

  // 前年12月 + 今年1〜12月 + 翌年1月 の14枚構成
  // インデックス: 0=前年12月, 1=1月, ..., 12=12月, 13=翌年1月
  const months = useMemo(
    () => [
      { year: year - 1, month: 12 },
      ...Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 })),
      { year: year + 1, month: 1 },
    ],
    [year],
  );

  const monthlyQueries = useSuspenseQueries({
    queries: months.map(({ year: y, month: m }) => monthlyQueryOptions(y, m)),
  });

  // 初期表示位置を固定（re-renderで変わらないようにする）
  const [initialMonth] = useState(currentMonth);
  const carouselOpts = useMemo(
    () => ({ startIndex: initialMonth }),
    [initialMonth],
  );

  // コールバックと現在月をrefで保持（selectハンドラ内でstaleな値を参照しないように）
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;
  const currentMonthRef = useRef(currentMonth);
  currentMonthRef.current = currentMonth;

  // Carousel selectイベントのリスナー（年跨ぎ対応）
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      const mo = currentMonthRef.current;

      if (selected === 0) {
        // 前年12月へ
        onMonthChangeRef.current(year - 1, 12);
      } else if (selected === 13) {
        // 翌年1月へ
        onMonthChangeRef.current(year + 1, 1);
      } else if (selected !== mo) {
        onMonthChangeRef.current(year, selected);
      }
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, year]);

  // 月が変更された時にスライドを対応する位置へスムーズスクロール
  // 14枚構成では月番号がそのままスライドインデックスに対応
  useEffect(() => {
    if (!api) return;
    const targetSlide = currentMonth;
    if (api.selectedScrollSnap() !== targetSlide) {
      api.scrollTo(targetSlide, false);
    }
  }, [currentMonth, api]);

  return (
    <Carousel opts={carouselOpts} setApi={setApi} className="max-w-4xl mx-auto">
      <CarouselContent>
        {months.map(({ year: y, month: m }, index) => {
          const monthData = monthlyQueries[index]?.data;

          return (
            <CarouselItem key={`${y}-${m}`}>
              <div className="p-1">
                <MonthlyCostTable
                  year={y}
                  month={m}
                  data={monthData}
                  isActive={y === year && m === currentMonth}
                />
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex" />
      <CarouselNext className="hidden md:flex" />
    </Carousel>
  );
}
