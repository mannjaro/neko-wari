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

  // (前年12月 +) 今年1〜12月 + 翌年1月 の構成
  // 前年がAPIの対応範囲（2025年以上）の場合のみ前年12月を先頭に追加
  const months = useMemo(
    () => [
      ...(year - 1 >= 2025 ? [{ year: year - 1, month: 12 }] : []),
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
    () => ({
      startIndex: months.findIndex(
        ({ year: y, month: m }) => y === year && m === initialMonth,
      ),
    }),
    // months/yearはyearが変わった時のみ変化するが、コンポーネントはkey={year}で再マウントされるため安全
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialMonth],
  );

  // コールバックと現在月をrefで保持（selectハンドラ内でstaleな値を参照しないように）
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;
  const currentMonthRef = useRef(currentMonth);
  currentMonthRef.current = currentMonth;

  // monthsのrefを保持（selectハンドラ内でstaleな値を参照しないように）
  const monthsRef = useRef(months);
  monthsRef.current = months;

  // Carousel selectイベントのリスナー（年跨ぎ対応）
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      const { year: selectedYear, month: selectedMonth } =
        monthsRef.current[selected];

      if (
        selectedYear !== year ||
        selectedMonth !== currentMonthRef.current
      ) {
        onMonthChangeRef.current(selectedYear, selectedMonth);
      }
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, year]);

  // 月が変更された時にスライドを対応する位置へスムーズスクロール
  useEffect(() => {
    if (!api) return;
    const targetSlide = months.findIndex(
      ({ year: y, month: m }) => y === year && m === currentMonth,
    );
    if (targetSlide !== -1 && api.selectedScrollSnap() !== targetSlide) {
      api.scrollTo(targetSlide, false);
    }
  }, [currentMonth, api, months, year]);

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
