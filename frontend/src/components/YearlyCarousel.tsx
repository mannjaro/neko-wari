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
  setApi,
}: {
  year: number;
  currentMonth: number;
  setApi: (api: CarouselApi) => void;
}) {
  const monthlyQueries = useSuspenseQueries({
    queries: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return monthlyQueryOptions(year, month);
    }),
  });

  return (
    <Carousel setApi={setApi} className="max-w-4xl mx-auto">
      <CarouselContent>
        {Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const monthQuery = monthlyQueries[index];
          const monthData = monthQuery?.data;

          return (
            <CarouselItem key={month}>
              <div className="p-1">
                <MonthlyCostTable
                  year={year}
                  month={month}
                  data={monthData}
                  isActive={month === currentMonth}
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
