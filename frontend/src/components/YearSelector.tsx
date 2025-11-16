import { Button } from "@/components/ui/button";

interface YearSelectorProps {
  currentYear: number;
  onYearChange: (year: number) => void;
}

const MIN_YEAR = 2025;

export function YearSelector({ currentYear, onYearChange }: YearSelectorProps) {
  // 表示・強調に用いる基準年（2024未満は2024に丸める）
  const baseYear = Math.max(currentYear, MIN_YEAR);
  // 前後2年（計5年）を表示。ただし下限は2024年
  const startYear = Math.max(baseYear - 2, MIN_YEAR);
  const years = Array.from({ length: 5 }, (_, i) => startYear + i);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start gap-2 py-3 overflow-x-auto">
          {years.map((year) => (
            <Button
              key={year}
              onClick={() => onYearChange(year)}
              variant={year === baseYear ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
            >
              {year}年
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
