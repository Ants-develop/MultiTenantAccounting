import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean;
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  label?: string;
  marks?: number[];
  step?: number;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue = false, showTooltip = false, formatValue, label, marks, step, ...props }, ref) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const values = props.value || (props.defaultValue || [0]);
  const min = props.min || 0;
  const max = props.max || 100;
  const stepValue = step || 1;

  const formatDisplayValue = React.useCallback((value: number) => {
    if (formatValue) return formatValue(value);
    return value.toString();
  }, [formatValue]);

  const getMarkPosition = (mark: number) => {
    return ((mark - min) / (max - min)) * 100;
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">{label}</label>
          {showValue && (
            <span className="text-sm text-muted-foreground">
              {Array.isArray(values) 
                ? values.map(formatDisplayValue).join(" - ")
                : formatDisplayValue(values[0] || 0)}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
          )}
          {...(stepValue !== 1 && { step: stepValue })}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-600">
            <SliderPrimitive.Range className="absolute h-full bg-indigo-500 dark:bg-indigo-400 transition-colors" />
            {marks && marks.map((mark, index) => (
              <div
                key={index}
                className="absolute top-1/2 h-1.5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-neutral-400 dark:bg-neutral-500"
                style={{ left: `${getMarkPosition(mark)}%` }}
              />
            ))}
          </SliderPrimitive.Track>
          {Array.isArray(values) ? (
            values.map((_, index) => (
              <SliderPrimitive.Thumb
                key={index}
                className={cn(
                  "group relative block h-4 w-4 rounded-full bg-indigo-500 dark:bg-indigo-400 shadow-md transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 disabled:pointer-events-none disabled:opacity-50",
                  showTooltip && "cursor-grab active:cursor-grabbing"
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {showTooltip && hoveredIndex === index && (
                  <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-popover">
                    {formatDisplayValue(values[index] || 0)}
                  </div>
                )}
              </SliderPrimitive.Thumb>
            ))
          ) : (
            <SliderPrimitive.Thumb
              className={cn(
                "group relative block h-4 w-4 rounded-full bg-indigo-500 dark:bg-indigo-400 shadow-md transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 disabled:pointer-events-none disabled:opacity-50",
                showTooltip && "cursor-grab active:cursor-grabbing"
              )}
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {showTooltip && hoveredIndex === 0 && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-popover">
                  {formatDisplayValue(values[0] || 0)}
                </div>
              )}
            </SliderPrimitive.Thumb>
          )}
        </SliderPrimitive.Root>
        {marks && (
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            {marks.map((mark, index) => (
              <span key={index} className="select-none">
                {formatDisplayValue(mark)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
export type { SliderProps };
