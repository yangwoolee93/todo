import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";
import { formatDate, shiftMonth, toYearMonth } from "@renderer/utils/dateUtils";
import { isKoreanPublicHoliday } from "@renderer/utils/koreanHolidays";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarCell = {
  date: string;
  day: number;
  year: number;
  month: number;
  inMonth: boolean;
};

function cellsForMonth(yearMonth: string): CalendarCell[] {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const first = new Date(year, month - 1, 1);
  const lead = first.getDay();
  const gridStart = new Date(year, month - 1, 1 - lead);
  const daysInMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    return {
      date: formatDate(date),
      day: date.getDate(),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      inMonth: date.getMonth() + 1 === month,
    };
  });
}

function dayToneClass(year: number, month: number, day: number) {
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || isKoreanPublicHoliday(year, month, day))
    return "text-danger";
  if (weekday === 6) return "text-saturday";
  return "text-fg";
}

function orderedRange(a: string, b: string) {
  return a <= b ? ([a, b] as const) : ([b, a] as const);
}

export default function DateRangeCalendar({
  startDate,
  endDate,
  focusDate,
  resetKey,
  className,
  onChange,
}: {
  startDate: string;
  endDate: string;
  focusDate: string;
  resetKey: number;
  className?: string;
  onChange: (start: string, end: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => toYearMonth(focusDate));
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    setViewMonth(toYearMonth(focusDate));
    setPendingStart(null);
    setHoverDate(null);
  }, [focusDate, resetKey]);

  const [viewYearStr, viewMonthStr] = viewMonth.split("-");
  const viewYear = Number(viewYearStr);
  const viewMonthNum = Number(viewMonthStr);

  const today = formatDate(new Date());
  const [rangeStart, rangeEnd] = pendingStart
    ? orderedRange(pendingStart, hoverDate ?? pendingStart)
    : [startDate, endDate];

  const handleDayClick = (date: string) => {
    if (!pendingStart) {
      setPendingStart(date);
      onChange(date, date);
      return;
    }
    const [start, end] = orderedRange(pendingStart, date);
    setPendingStart(null);
    setHoverDate(null);
    onChange(start, end);
  };

  return (
    <div className={cn("p-0", className)}>
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          className="rounded-(--radius-btn) p-0.5 text-fg-secondary hover:bg-surface hover:text-fg"
          aria-label="이전 달"
          onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="text-base font-medium text-fg">
          {viewYear}년 {viewMonthNum}월
        </p>
        <button
          type="button"
          className="rounded-(--radius-btn) p-0.5 text-fg-secondary hover:bg-surface hover:text-fg"
          aria-label="다음 달"
          onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7" onMouseLeave={() => setHoverDate(null)}>
        {WEEKDAYS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "py-0.5 text-center text-xs font-medium text-fg-muted",
              index === 0 && "text-danger",
              index === 6 && "text-saturday",
            )}
          >
            {label}
          </div>
        ))}
        {cellsForMonth(viewMonth).map((cell) => {
          const inRange = cell.date >= rangeStart && cell.date <= rangeEnd;
          const isStart = cell.date === rangeStart;
          const isEnd = cell.date === rangeEnd;
          const isEdge = isStart || isEnd;
          const isToday = cell.date === today;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => handleDayClick(cell.date)}
              onMouseEnter={() => pendingStart && setHoverDate(cell.date)}
              className={cn(
                "relative flex h-8 items-center justify-center text-xs",
                !cell.inMonth && "opacity-40",
                inRange && !isEdge && "bg-accent-soft",
                isStart &&
                  rangeStart !== rangeEnd &&
                  "rounded-l-(--radius-btn) bg-accent-soft",
                isEnd &&
                  rangeStart !== rangeEnd &&
                  "rounded-r-(--radius-btn) bg-accent-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  !isEdge && dayToneClass(cell.year, cell.month, cell.day),
                  isEdge && "bg-accent font-medium text-white",
                  isToday && !isEdge && "ring-1 ring-accent/50",
                )}
              >
                {cell.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
