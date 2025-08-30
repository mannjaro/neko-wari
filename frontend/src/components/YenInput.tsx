import * as React from "react";
import { cn } from "@/lib/utils";

interface YenInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "value" | "onChange" | "defaultValue"
  > {
  value?: number;
  onChange?: (value: number | undefined) => void;
  defaultValue?: number;
  className?: string;
}

function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseYenValue(formattedValue: string): number | undefined {
  const numericString = formattedValue.replace(/[^\d]/g, "");
  const parsed = parseInt(numericString, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export const YenInput = React.forwardRef<HTMLInputElement, YenInputProps>(
  ({ value, onChange, defaultValue, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [internalValue, setInternalValue] = React.useState<
      number | undefined
    >(value ?? defaultValue);

    // Initialize display value
    React.useEffect(() => {
      const initialValue = value ?? defaultValue;
      if (initialValue !== undefined) {
        setDisplayValue(formatYen(initialValue));
        setInternalValue(initialValue);
      } else {
        setDisplayValue("");
        setInternalValue(undefined);
      }
    }, [value, defaultValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = (e.target as unknown as { value: string }).value;

      if (inputValue === "" || inputValue === "¥") {
        setDisplayValue("¥");
        setInternalValue(undefined);
        onChange?.(undefined);
        return;
      }

      const numericValue = parseYenValue(inputValue);

      if (numericValue !== undefined) {
        const formatted = formatYen(numericValue);
        setDisplayValue(formatted);
        setInternalValue(numericValue);
        onChange?.(numericValue);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const currentValue = value ?? internalValue;
      if (currentValue !== undefined) {
        // フォーカス時も¥マークを保持
        setDisplayValue(formatYen(currentValue));
      } else {
        setDisplayValue("¥");
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const currentValue = value ?? internalValue;
      if (currentValue !== undefined) {
        setDisplayValue(formatYen(currentValue));
      } else {
        setDisplayValue("");
      }
      props.onBlur?.(e);
    };

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
      />
    );
  },
);
