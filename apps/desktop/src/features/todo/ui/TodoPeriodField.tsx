import { useEffect, useRef, useState } from "react";
import {
  getMonthDateRange,
  getTodayString,
  toShortLabel,
  toYearMonth,
} from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { Button, ChevronRightIcon } from "@renderer/shared/ui";
import DateRangeCalendar from "./DateRangeCalendar";

const presetBtnClass =
  "rounded-(--radius-btn) px-2 py-1 text-xs whitespace-nowrap transition-colors";

export default function TodoPeriodField({
  startDate,
  endDate,
  resetStart,
  resetEnd,
  inputId = "todo-range",
  onChange,
}: {
  startDate: string;
  endDate: string;
  resetStart: string;
  resetEnd: string;
  inputId?: string;
  onChange: (start: string, end: string) => void;
}) {
  const today = getTodayString();
  const thisMonth = getMonthDateRange(toYearMonth(today));

  const [focusDate, setFocusDate] = useState(startDate);
  const [calendarReset, setCalendarReset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const savedRangeRef = useRef({ start: startDate, end: endDate });

  const isSingleDay = startDate === endDate;
  const isTodayPreset = startDate === today && endDate === today;
  const isThisMonthPreset =
    startDate === thisMonth.start && endDate === thisMonth.end;

  useEffect(() => {
    if (!calendarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      const { start, end } = savedRangeRef.current;
      bump(start, end, start);
      setCalendarOpen(false);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [calendarOpen]);

  const bump = (start: string, end: string, focus: string) => {
    onChange(start, end);
    setFocusDate(focus);
    setCalendarReset((n) => n + 1);
  };

  const confirmCalendar = () => setCalendarOpen(false);

  const cancelCalendar = () => {
    const { start, end } = savedRangeRef.current;
    bump(start, end, start);
    setCalendarOpen(false);
  };

  const toggleCalendar = () => {
    if (calendarOpen) {
      cancelCalendar();
      return;
    }
    savedRangeRef.current = { start: startDate, end: endDate };
    setFocusDate(startDate);
    setCalendarReset((n) => n + 1);
    setCalendarOpen(true);
  };

  const rangeLabel = isSingleDay
    ? toShortLabel(startDate)
    : `${toShortLabel(startDate)} ~ ${toShortLabel(endDate)}`;

  return (
    <div className="relative z-20 flex flex-col gap-2">
      {calendarOpen && (
        <div
          className="fixed inset-0 z-10 rounded-(--radius-card)"
          aria-hidden="true"
          onPointerDown={cancelCalendar}
        />
      )}
      <label
        className="block text-xs font-medium text-fg-secondary"
        htmlFor={inputId}
      >
        기간
      </label>
      <button
        id={inputId}
        type="button"
        aria-expanded={calendarOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex w-full items-center justify-between rounded-(--radius-btn) border bg-surface px-3 py-2 text-sm text-fg",
          "outline-none",
          calendarOpen
            ? "border-accent ring-2 ring-accent/20"
            : "border-border hover:border-accent/60",
        )}
        onClick={toggleCalendar}
      >
        <span>{rangeLabel}</span>
        <ChevronRightIcon
          className={cn(
            "text-fg-muted transition-transform",
            calendarOpen && "rotate-90",
          )}
        />
      </button>

      {calendarOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 flex gap-2 rounded-(--radius-card) border border-border bg-surface p-2 shadow-lg">
          <DateRangeCalendar
            startDate={startDate}
            endDate={endDate}
            focusDate={focusDate}
            resetKey={calendarReset}
            className="min-w-0 flex-1"
            onChange={(start, end) => onChange(start, end)}
          />
          <div className="flex shrink-0 flex-col self-stretch">
            <div
              className="flex flex-col gap-0.5 rounded-(--radius-btn) bg-muted p-1"
              role="group"
              aria-label="기간 빠른 선택"
            >
              <button
                type="button"
                className={cn(presetBtnClass, "text-fg-secondary hover:text-fg")}
                onClick={() => bump(resetStart, resetEnd, resetStart)}
              >
                초기화
              </button>
              <button
                type="button"
                className={cn(
                  presetBtnClass,
                  isTodayPreset
                    ? "bg-surface font-medium text-fg shadow-sm"
                    : "text-fg-secondary hover:text-fg",
                )}
                onClick={() => bump(today, today, today)}
              >
                오늘로
              </button>
              <button
                type="button"
                className={cn(
                  presetBtnClass,
                  isThisMonthPreset
                    ? "bg-surface font-medium text-fg shadow-sm"
                    : "text-fg-secondary hover:text-fg",
                )}
                onClick={() =>
                  bump(thisMonth.start, thisMonth.end, thisMonth.start)
                }
              >
                이번 달
              </button>
            </div>
            <div className="mt-auto flex flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={cancelCalendar}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="primary"
                className="px-2 py-1 text-xs"
                onClick={confirmCalendar}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
