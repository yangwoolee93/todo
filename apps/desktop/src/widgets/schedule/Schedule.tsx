import { useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import { alignDateToYearMonth, toYearMonth } from "@renderer/utils/dateUtils";
import ScheduleToolbar, { type ScheduleView } from "./ScheduleToolbar";
import ScheduleDayBoard from "./ScheduleDayBoard";
import ScheduleMonthBoard from "./ScheduleMonthBoard";

/** 일정 화면 — 툴바 + 일/월 본문 */
export default function Schedule() {
  const [view, setView] = useState<ScheduleView>("day");
  const [scrollToTodayTick, setScrollToTodayTick] = useState(0);
  const activeDate = useUIStore((s) => s.activeDate);
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);

  const alignTodayInBoard = () => {
    setScrollToTodayTick((n) => n + 1);
  };

  const handleViewChange = (next: ScheduleView) => {
    if (next === "month") {
      setYearMonth(toYearMonth(activeDate));
      setView("month");
      alignTodayInBoard();
      return;
    }

    setActiveDate(alignDateToYearMonth(activeDate, yearMonth));
    setView("day");
  };

  const handleOpenDay = (date: string) => {
    setActiveDate(date);
    setView("day");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <ScheduleToolbar view={view} onViewChange={handleViewChange} onAlignToday={alignTodayInBoard} />
      {view === "day" ? (
        <ScheduleDayBoard />
      ) : (
        <ScheduleMonthBoard
          onOpenDay={handleOpenDay}
          scrollToTodayTick={scrollToTodayTick}
          onAlignToday={alignTodayInBoard}
        />
      )}
    </div>
  );
}
