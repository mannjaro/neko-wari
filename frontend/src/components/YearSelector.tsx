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

  const thisYear = new Date().getFullYear();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
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
          {currentYear !== thisYear && (
            <Button
              onClick={() => onYearChange(thisYear)}
              variant="ghost"
              size="sm"
              className="whitespace-nowrap flex items-center gap-1"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              今年
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
