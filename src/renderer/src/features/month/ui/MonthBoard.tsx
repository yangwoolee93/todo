import { useEffect, useRef, useState } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { getTodayString, shiftMonth, toYearMonth } from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMonthStore } from "../model/useMonthStore";
import { Card, Button, ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";

function toMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  return `${yearStr}년 ${Number(monthStr)}월`;
}

/**
 * 월별 모아보기 (F-03)
 * - 일=열, 투두=열 내부 세로 나열, Read-Only
 * - 열 클릭: 선택 / 재클릭: 선택 해제, 선택 시 하단 이동 버튼
 */
export default function MonthBoard() {
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const summaries = useMonthStore((s) => s.summaries);
  const loading = useMonthStore((s) => s.loading);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const goTodayView = useUIStore((s) => s.goTodayView);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const today = getTodayString();
  const currentYearMonth = toYearMonth(today);
  const isCurrentMonth = yearMonth === currentYearMonth;

  useEffect(() => {
    void loadMonthSummary(yearMonth);
  }, [yearMonth, loadMonthSummary]);

  const changeYearMonth = (next: string) => {
    setSelectedDate(null);
    setYearMonth(next);
  };

  /** 데이터 로드 완료 시 오늘 열을 가운데로 스크롤 */
  useEffect(() => {
    if (summaries.length === 0) return;
    todayColumnRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [summaries]);

  const handleColumnClick = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const handleGoToDate = (date: string) => {
    setActiveDate(date);
    goTodayView();
    setSelectedDate(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <Card className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="cursor-default text-xs font-semibold uppercase tracking-wide text-accent">
                월별
              </span>
              {!isCurrentMonth && (
                <Button
                  variant="ghost"
                  className="bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-xs hover:bg-[rgba(255,255,255,0.1)]"
                  onClick={() => changeYearMonth(currentYearMonth)}
                >
                  이번 달로
                </Button>
              )}
            </div>
            <h2 className="text-xl font-semibold text-fg">{toMonthLabel(yearMonth)}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 pl-1.5 text-xs"
              aria-label="이전 달"
              onClick={() => changeYearMonth(shiftMonth(yearMonth, -1))}
            >
              <ChevronLeftIcon />
              이전 달
            </Button>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 pr-1.5 text-xs"
              aria-label="다음 달"
              onClick={() => changeYearMonth(shiftMonth(yearMonth, 1))}
            >
              다음 달
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </Card>

      {loading && summaries.length === 0 ? (
        <p className="text-sm text-fg-secondary">불러오는 중...</p>
      ) : (
        <div ref={scrollRef} className="scrollbar flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
          {summaries.map((column) => {
            const isTodayColumn = column.date === today;
            const isSelected = selectedDate === column.date;

            return (
              <div
                key={column.date}
                ref={isTodayColumn ? todayColumnRef : undefined}
                aria-pressed={isSelected}
                aria-label={`${column.day}일`}
                onClick={() => handleColumnClick(column.date)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleColumnClick(column.date);
                  }
                }}
                className={cn(
                  "relative flex w-36 shrink-0 cursor-pointer flex-col overflow-hidden rounded-(--radius-card) border bg-surface transition-colors hover:bg-muted/20",
                  isTodayColumn ? "border-fg-secondary" : "border-border",
                  isSelected && "border-accent",
                )}
              >
                <div
                  className={cn(
                    "border-b px-2 py-2 text-center text-sm font-semibold",
                    "border-border text-fg",
                    isTodayColumn && "bg-accent-soft",
                    isSelected && !isTodayColumn && "bg-muted/40",
                  )}
                >
                  {column.day}일
                </div>

                <ul className="scrollbar flex flex-col flex-1 gap-1 overflow-y-auto p-2">
                  {column.todos.length === 0 ? (
                    <li className="py-4 text-center text-xs text-fg-muted">—</li>
                  ) : (
                    column.todos.map((todo) => (
                      <li
                        key={`${column.date}-${todo.id}`}
                        className={`rounded px-1.5 py-1 text-xs leading-snug ${getTodoTextClass(todo.status)}`}
                      >
                        {todo.content}
                      </li>
                    ))
                  )}
                </ul>

                {isSelected && (
                  <div className="absolute bottom-0 right-0 flex items-center justify-end shrink-0 m-2 rounded-md">
                    <Button
                      variant="primary"
                      className="py-1 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleGoToDate(column.date);
                      }}
                    >
                      이동
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
