import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { yearlyQueryOptions } from "@/hooks/useQueryOptions";
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
  const yearlyQuery = useSuspenseQuery(yearlyQueryOptions(year));

  return (
    <Carousel setApi={setApi} className="max-w-4xl mx-auto">
      <CarouselContent>
        {Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          const monthData = yearlyQuery.data.get(month);

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
