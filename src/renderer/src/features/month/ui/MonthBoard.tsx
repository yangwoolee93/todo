import { useEffect, useRef } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { getTodayString, shiftMonth, toYearMonth } from "@renderer/utils/dateUtils";
import { useDragScroll } from "@renderer/hooks/useDragScroll";
import { useMonthStore } from "../model/useMonthStore";
import { Card, Button, ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";

function toMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  return `${yearStr}년 ${Number(monthStr)}월`;
}

/**
 * 월별 모아보기 (F-03)
 * - 일=열, 투두=열 내부 세로 나열, Read-Only
 */
export default function MonthBoard() {
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const summaries = useMonthStore((s) => s.summaries);
  const loading = useMonthStore((s) => s.loading);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);

  const { scrollRef, dragHandlers } = useDragScroll<HTMLDivElement>();
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const today = getTodayString();
  const currentYearMonth = toYearMonth(today);
  const isCurrentMonth = yearMonth === currentYearMonth;

  useEffect(() => {
    void loadMonthSummary(yearMonth);
  }, [yearMonth, loadMonthSummary]);

  /** 데이터 로드 완료 시 오늘 열을 가운데로 스크롤 */
  useEffect(() => {
    if (summaries.length === 0) return;
    todayColumnRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [summaries]);

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
                  onClick={() => setYearMonth(currentYearMonth)}
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
              onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}
            >
              <ChevronLeftIcon />
              이전 달
            </Button>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 pr-1.5 text-xs"
              aria-label="다음 달"
              onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}
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
        <div
          ref={scrollRef}
          className="scrollbar flex min-h-0 flex-1 cursor-grab gap-3 pb-2 overflow-x-auto active:cursor-grabbing"
          {...dragHandlers}
        >
          {summaries.map((column) => {
            const isTodayColumn = column.date === today;
            return (
              <div
                key={column.date}
                ref={isTodayColumn ? todayColumnRef : undefined}
                className={`flex w-36 shrink-0 flex-col overflow-hidden rounded-(--radius-card) border bg-surface ${
                  isTodayColumn ? "border-accent ring-2 ring-today-ring/30" : "border-border"
                }`}
              >
                <div
                  className={`border-b px-2 py-2 text-center text-sm font-semibold ${
                    isTodayColumn
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-border text-fg"
                  }`}
                >
                  {column.day}일
                </div>

                <ul className="scrollbar flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
