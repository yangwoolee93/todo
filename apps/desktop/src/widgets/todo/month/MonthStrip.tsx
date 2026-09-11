import { cn } from "@renderer/utils/cn";
import { MONTHS } from "@renderer/widgets/todo/month/constants";
import StripArrow from "@renderer/widgets/todo/StripArrow";
import { YEAR_END, YEAR_START } from "@renderer/widgets/todo/year/constants";
import { useEffect, useRef } from "react";

export default function MonthStrip({
  year,
  month,
  setMonth,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  setMonth: (month: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const canPrev = year > YEAR_START;
  const canNext = year < YEAR_END;

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const listRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const scrollMonthIntoView = (targetMonth: number) => {
    const root = listRef.current;
    const target = cellRefs.current.get(targetMonth);
    if (!root || !target) return;

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    root.scrollLeft +=
      targetRect.left - rootRect.left - root.clientWidth / 2 + targetRect.width / 2;
  };

  useEffect(() => {
    if (month) scrollMonthIntoView(month);
  }, [month]);

  return (
    <div className="flex items-start gap-2 px-2">
      <div className="flex h-22 shrink-0 items-center">
        <StripArrow
          direction="prev"
          disabled={!canPrev}
          label="전년"
          onClick={onPrev ?? (() => {})}
        />
      </div>
      <div
        ref={listRef}
        className="scrollbar min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-gutter-stable pb-1"
      >
        <div className="flex h-22 gap-2 items-center">
          {MONTHS.map((item) => {
            const selected = item === month;
            const isThisMonth = year === thisYear && item === thisMonth;
            return (
              <button
                key={item}
                ref={(node) => {
                  if (node) cellRefs.current.set(item, node);
                  else cellRefs.current.delete(item);
                }}
                type="button"
                className={cn(
                  "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-(--radius-card) gap-2",
                  "border-2 border-transparent bg-surface",
                  "hover:bg-muted",
                  selected && "border-accent w-26 h-22",
                )}
                onClick={() => setMonth(item)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    "bg-fg-secondary/10 hidden",
                    isThisMonth && "bg-fg-secondary flex",
                  )}
                />
                <span className="text-3xl font-bold leading-none">
                  {item}
                  <span className={cn("text-[0.75rem] font-normal text-fg-secondary")}>월</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex h-22 shrink-0 items-center">
        <StripArrow
          direction="next"
          disabled={!canNext}
          label="다음 해"
          onClick={onNext ?? (() => {})}
        />
      </div>
    </div>
  );
}
