import { useEffect, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import {
  getTodayString,
  isToday,
  shiftMonth,
  toFullLabel,
  toYearMonth,
} from "@renderer/utils/dateUtils";
import { Button, Card, ChevronLeftIcon, ChevronRightIcon, Tab } from "@renderer/shared/ui";

type ScheduleView = "day" | "month";

function toMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  return `${yearStr}년 ${Number(monthStr)}월`;
}

/** 일정 화면 상단 — 일/월 보기, 날짜 이동, 개수, 추가 */
export default function ScheduleToolbar() {
  const [view, setView] = useState<ScheduleView>("day");

  const activeDate = useUIStore((s) => s.activeDate);
  const goTodayDate = useUIStore((s) => s.goTodayDate);
  const goPrevDate = useUIStore((s) => s.goPrevDate);
  const goNextDate = useUIStore((s) => s.goNextDate);
  const openAddModal = useUIStore((s) => s.openAddModal);

  const dayCount = useTodoStore((s) => s.todos.length);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);

  const yearMonth = useMonthStore((s) => s.yearMonth);
  const setYearMonth = useMonthStore((s) => s.setYearMonth);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);
  const monthCount = useMonthStore((s) =>
    s.summaries.reduce((sum, day) => sum + day.todos.length, 0),
  );

  const today = getTodayString();
  const currentYearMonth = toYearMonth(today);
  const showingToday = isToday(activeDate);
  const showingCurrentMonth = yearMonth === currentYearMonth;

  useEffect(() => {
    if (view === "day") {
      void loadTodosByDate(activeDate);
      return;
    }
    void loadMonthSummary(yearMonth);
  }, [view, activeDate, yearMonth, loadTodosByDate, loadMonthSummary]);

  const handleViewDay = () => {
    setView("day");
  };

  const handleViewMonth = () => {
    setYearMonth(toYearMonth(activeDate));
    setView("month");
  };

  const handlePrev = () => {
    if (view === "day") {
      goPrevDate();
      return;
    }
    setYearMonth(shiftMonth(yearMonth, -1));
  };

  const handleNext = () => {
    if (view === "day") {
      goNextDate();
      return;
    }
    setYearMonth(shiftMonth(yearMonth, 1));
  };

  const handleNow = () => {
    if (view === "day") {
      goTodayDate();
      return;
    }
    setYearMonth(currentYearMonth);
  };

  const title = view === "day" ? toFullLabel(activeDate) : toMonthLabel(yearMonth);
  const count = view === "day" ? dayCount : monthCount;
  const nowDisabled = view === "day" ? showingToday : showingCurrentMonth;
  const nowLabel = view === "day" ? "오늘" : "이번 달";
  const prevLabel = view === "day" ? "전날" : "이전 달";
  const nextLabel = view === "day" ? "다음날" : "다음 달";

  return (
    <Card className="shrink-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex w-fit gap-1" role="group" aria-label="일정 보기">
              <Tab
                active={view === "day"}
                className="px-2.5 py-0.5 text-xs"
                onClick={handleViewDay}
              >
                일
              </Tab>
              <Tab
                active={view === "month"}
                className="px-2.5 py-0.5 text-xs"
                onClick={handleViewMonth}
              >
                월
              </Tab>
            </div>
            <h2 className="text-xl font-semibold text-fg">{title}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 pl-1.5 text-xs"
              aria-label={prevLabel}
              onClick={handlePrev}
            >
              <ChevronLeftIcon />
              {prevLabel}
            </Button>
            <Button
              variant="ghost"
              disabled={nowDisabled}
              className="bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-xs hover:bg-[rgba(255,255,255,0.1)] disabled:cursor-default disabled:opacity-40"
              onClick={handleNow}
            >
              {nowLabel}
            </Button>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 pr-1.5 text-xs"
              aria-label={nextLabel}
              onClick={handleNext}
            >
              {nextLabel}
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-secondary">{count}건의 할 일</p>
          <Button variant="primary" className="text-sm" onClick={openAddModal}>
            할 일 추가
          </Button>
        </div>
      </div>
    </Card>
  );
}
