import { cn } from "@renderer/utils/cn";
import StripArrow from "@renderer/widgets/todo/StripArrow";
import { WEEKDAYS } from "@renderer/widgets/todo/month/constants";
import { dateHeadTextClass } from "@renderer/widgets/todo/month/monthTimelineTempUtil";
import { YEAR_END, YEAR_START } from "@renderer/widgets/todo/year/constants";
import { useEffect, useRef } from "react";

export default function DayStrip({
  year,
  month,
  day,
  setDay,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  day: number;
  setDay: (day: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const canPrev = prev.getFullYear() >= YEAR_START;
  const canNext = next.getFullYear() <= YEAR_END;

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const thisDay = now.getDate();
  const dayCount = new Date(year, month, 0).getDate();

  const listRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const scrollDayIntoView = (targetDay: number) => {
    const root = listRef.current;
    const target = cellRefs.current.get(targetDay);
    if (!root || !target) return;

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    root.scrollLeft +=
      targetRect.left - rootRect.left - root.clientWidth / 2 + targetRect.width / 2;
  };

  useEffect(() => {
    if (day) scrollDayIntoView(day);
  }, [day, year, month, dayCount]);

  return (
    <div className="flex items-start gap-2 px-2">
      <div className="flex h-28 shrink-0 items-center">
        <StripArrow
          direction="prev"
          disabled={!canPrev}
          label="전달"
          onClick={onPrev ?? (() => {})}
        />
      </div>
      <div
        ref={listRef}
        className="scrollbar min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-gutter-stable pb-1"
      >
        <div className="flex h-28 gap-2 items-center">
          {Array.from({ length: dayCount }).map((_, index) => {
            const date = index + 1;
            const selected = date === day;
            const isToday = year === thisYear && month === thisMonth && date === thisDay;
            const headColor = dateHeadTextClass(year, month, date);
            return (
              <button
                key={date}
                ref={(node) => {
                  if (node) cellRefs.current.set(date, node);
                  else cellRefs.current.delete(date);
                }}
                type="button"
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "relative flex h-26 w-24 shrink-0 flex-col items-center justify-center rounded-(--radius-card) gap-2",
                  "border-2 border-transparent bg-surface",
                  "hover:bg-muted",
                  selected && "border-accent w-26 h-28",
                )}
                onClick={() => setDay(date)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    "bg-fg-secondary/10 hidden",
                    isToday && "bg-fg-secondary flex",
                  )}
                />
                <span className={cn("text-3xl font-bold leading-none", headColor)}>{date}</span>
                <span
                  className={cn(
                    "text-[0.75rem] font-normal",
                    headColor ?? "text-fg-secondary",
                    selected && (headColor ?? "text-fg"),
                  )}
                >
                  {WEEKDAYS[new Date(year, month - 1, date).getDay()]}요일
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex h-28 shrink-0 items-center">
        <StripArrow
          direction="next"
          disabled={!canNext}
          label="다음 달"
          onClick={onNext ?? (() => {})}
        />
      </div>
    </div>
  );
}
