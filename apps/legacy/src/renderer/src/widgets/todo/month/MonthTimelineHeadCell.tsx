import { cn } from "@renderer/utils/cn";
import { DAY_COL_WIDTH, WEEKDAYS } from "./constants";
import { RefObject } from "react";
import { dateHeadTextClass } from "./monthTimelineTempUtil";

export default function MonthTimelineHeadCell({
  year,
  month,
  date,
  todayRef,
  onClickDay,
}: {
  year: number;
  month: number;
  date: number;
  todayRef: RefObject<HTMLButtonElement | null>;
  onClickDay: (date: number) => void;
}) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const thisDay = now.getDate();
  const isToday = year === thisYear && month === thisMonth && date === thisDay;
  const headColor = dateHeadTextClass(year, month, date);
  return (
    <button
      ref={isToday ? todayRef : undefined}
      type="button"
      style={{ width: DAY_COL_WIDTH }}
      className="flex shrink-0 flex-col items-center gap-1 border-r border-border/50 py-2"
      onClick={() => onClickDay(date)}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          "bg-fg-secondary/10 opacity-0",
          isToday && "bg-fg-secondary opacity-100",
        )}
      />
      <span className={cn("text-[0.75rem]", headColor ?? "text-fg-secondary")}>
        {WEEKDAYS[new Date(year, month - 1, date).getDay()]}
      </span>
      <span
        className={cn(
          "flex w-10 items-center justify-center rounded-(--radius-btn) text-lg font-medium",
          headColor,
        )}
      >
        {date}
      </span>
    </button>
  );
}
