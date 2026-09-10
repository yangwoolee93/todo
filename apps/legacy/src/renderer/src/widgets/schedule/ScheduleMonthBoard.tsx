import { useEffect, useState } from "react";
import { getTodayString, toYearMonth } from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import {
  MonthColumnsView,
  MonthTimelineView,
  MonthViewToggle,
} from "@renderer/features/month";
import { Card, Button } from "@renderer/shared/ui";

type ScheduleMonthBoardProps = {
  onOpenDay: (date: string) => void;
  scrollToTodayTick: number;
  onAlignToday: () => void;
};

/** 일정 — 월 모아보기 (툴바 아래 본문) */
export default function ScheduleMonthBoard({
  onOpenDay,
  scrollToTodayTick,
  onAlignToday,
}: ScheduleMonthBoardProps) {
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const viewMode = useMonthStore((s) => s.viewMode);
  const setViewMode = useMonthStore((s) => s.setViewMode);
  const summaries = useMonthStore((s) => s.summaries);
  const loading = useMonthStore((s) => s.loading);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = getTodayString();
  const currentYearMonth = toYearMonth(today);

  useEffect(() => {
    void loadMonthSummary(yearMonth);
  }, [yearMonth, loadMonthSummary]);

  useEffect(() => {
    setSelectedDate(null);
  }, [yearMonth]);

  const handleDateClick = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const handleGoToDate = (date: string) => {
    onOpenDay(date);
    setSelectedDate(null);
  };

  const handleScrollToToday = () => {
    if (yearMonth !== currentYearMonth) {
      setSelectedDate(null);
      setYearMonth(currentYearMonth);
      setActiveDate(today);
    }
    onAlignToday();
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-xs"
          disabled={loading && summaries.length === 0}
          onClick={() => handleScrollToToday()}
        >
          오늘 위치로
        </Button>
        <MonthViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {loading && summaries.length === 0 ? (
          <p className="px-4 py-8 text-sm text-fg-secondary">불러오는 중...</p>
        ) : viewMode === "columns" ? (
          <MonthColumnsView {...dayViewProps} />
        ) : (
          <MonthTimelineView {...dayViewProps} />
        )}
      </Card>
    </div>
  );
}
