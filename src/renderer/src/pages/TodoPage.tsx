import { Tab } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";
import GoToTodayButton from "@renderer/widgets/todo/GoToTodayButton";
import MonthStrip from "@renderer/widgets/todo/month/MonthStrip";
import MonthTimeline from "@renderer/widgets/todo/month/MonthTimeline";
import YearGrid from "@renderer/widgets/todo/year/YearGrid";
import { useEffect, useState } from "react";

export default function TodoPage() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const [year, setYear] = useState(thisYear); // 선택된 연
  const [month, setMonth] = useState(now.getMonth() + 1); // 선택된 월
  const [day, setDay] = useState(now.getDate()); // 선택된 일
  const [isYearView, setIsYearView] = useState(false); // 연 선택화면 열림 여부
  const [isMonthView, setIsMonthView] = useState(false); // 월 선택화면 열림 여부
  const [mode, setMode] = useState<"timeline" | "agenda">("timeline");
  const [isDayView, setIsDayView] = useState(false); // 일 선택화면 열림 여부

  function clampDay(year: number, month: number, day: number) {
    return Math.min(day, new Date(year, month, 0).getDate());
  }

  const goToMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay((prev) => clampDay(nextYear, nextMonth, prev));
  };

  const goPrevYear = () => {
    goToMonth(year - 1, month);
  };

  const goNextYear = () => {
    goToMonth(year + 1, month);
  };

  const [selectedYear, setSelectedYear] = useState(year);

  const onClickDay = (date: number) => {
    setDay(date);
    setIsMonthView(false);
    setIsDayView(true);
  };

  useEffect(() => {
    console.log(isYearView);
    if (!isYearView) {
      setIsMonthView(true);
    }
  }, [isYearView]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 선택된 YYYY-MM-DD 표시 */}
      <div className="text-sm bg-red-500 text-white">
        TEST : {year}-{month}-{day}
      </div>
      <div className="flex flex-col m-6 mb-2 gap-2">
        <div className="flex gap-4">
          <div
            className={cn(
              "w-fit cursor-pointer rounded-(--radius-btn) bg-surface px-3 py-1 text-2xl font-medium text-fg",
              "hover:bg-muted",
              "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
            )}
            onClick={() => {
              setIsYearView(true);
              setIsMonthView(false);
              setIsDayView(false);
            }}
          >
            {year}년
          </div>
          {isYearView && selectedYear !== thisYear && (
            <GoToTodayButton onClick={() => setSelectedYear(thisYear)} />
          )}
          {!isYearView && isMonthView && (
            <GoToTodayButton
              onClick={() => {
                setYear(thisYear);
                setMonth(thisMonth);
              }}
            />
          )}
        </div>
        {isYearView && (
          <YearGrid
            year={year}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            onSelectYear={() => {
              setYear(selectedYear);
              setIsYearView(false);
            }}
          />
        )}
      </div>
      {/* 월 */}
      {!isYearView && (
        <>
          {isMonthView ? (
            <MonthStrip
              year={year}
              month={month}
              setMonth={setMonth}
              onPrev={goPrevYear}
              onNext={goNextYear}
            />
          ) : (
            <div className="flex gap-4 mx-6 mb-2">
              <div
                className="w-fit cursor-pointer rounded-(--radius-btn) bg-surface px-3 py-1 text-2xl font-medium text-fg"
                onClick={() => {
                  setIsMonthView(true);
                  setIsDayView(false);
                }}
              >
                {month}월
              </div>
            </div>
          )}
        </>
      )}

      {/* 월,일 화면 영역 */}
      {/* 월 화면 영역 - month overview */}
      {isMonthView && (
        <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 justify-end gap-1">
            <Tab active={mode === "timeline"} onClick={() => setMode("timeline")}>
              타임라인
            </Tab>
            <Tab active={mode === "agenda"} onClick={() => setMode("agenda")}>
              목록
            </Tab>
          </div>
          {mode === "timeline" ? (
            <MonthTimeline year={year} month={month} onClickDay={onClickDay} />
          ) : (
            // <MonthAgendaDraft
            //   year={year}
            //   month={month}
            //   thisYear={thisYear}
            //   thisMonth={thisMonth}
            //   thisDay={thisDay}
            //   summaries={summaries}
            //   ready={ready}
            //   scrollToTodayTick={scrollToTodayTick}
            //   onOpenDay={onOpenDay}
            // />
            <>목록</>
          )}
        </div>
      )}

      {/* 일 화면 영역 - day overview */}
      {isDayView && <>일화면</>}
    </div>
  );
}
