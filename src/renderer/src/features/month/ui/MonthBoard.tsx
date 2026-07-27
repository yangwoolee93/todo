import { useEffect, useState } from "react";
import { getTodayString, shiftMonth, toYearMonth } from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMonthStore } from "../model/useMonthStore";
import { Card, Button, ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";
import { MonthViewToggle } from "./MonthViewToggle";
import MonthColumnsView from "./MonthColumnsView";
import MonthTimelineView from "./MonthTimelineView";

function toMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  return `${yearStr}년 ${Number(monthStr)}월`;
}

/**
 * 월별 모아보기 (F-03)
 * - 열 보기 / 타임라인 보기 전환
 * - Read-Only, 날짜 선택 후 오늘 탭으로 이동
 */
export default function MonthBoard() {
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const viewMode = useMonthStore((s) => s.viewMode);
  const setViewMode = useMonthStore((s) => s.setViewMode);
  const summaries = useMonthStore((s) => s.summaries);
  const loading = useMonthStore((s) => s.loading);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const goTodayView = useUIStore((s) => s.goTodayView);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scrollToTodayTick, setScrollToTodayTick] = useState(0);
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

  const handleDateClick = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const handleGoToDate = (date: string) => {
    setActiveDate(date);
    goTodayView();
    setSelectedDate(null);
  };

  const handleScrollToToday = () => {
    if (yearMonth !== currentYearMonth) {
      setSelectedDate(null);
      setYearMonth(currentYearMonth);
    }
    setScrollToTodayTick((n) => n + 1);
  };

  const dayViewProps = {
    summaries,
    today,
    selectedDate,
    onDateClick: handleDateClick,
    onGoToDate: handleGoToDate,
    scrollToTodayTick,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
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

      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-xs"
          disabled={loading && summaries.length === 0}
          onClick={() => handleScrollToToday()}
        >
          오늘로
        </Button>
        <MonthViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {loading && summaries.length === 0 ? (
        <p className="text-sm text-fg-secondary">불러오는 중...</p>
      ) : viewMode === "columns" ? (
        <MonthColumnsView {...dayViewProps} />
      ) : (
        <MonthTimelineView {...dayViewProps} />
      )}
    </div>
  );
}
