import { useEffect, useRef, useState } from "react";
import { Button, Card, CloseIcon, Modal, ModalTitle } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEAR_START = 2000;
const YEAR_END = 2040;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => YEAR_START + index);

type MonthDraft = number | "all";

const triggerClass = cn(
  "w-fit cursor-pointer rounded-(--radius-btn) bg-muted px-3 py-1 text-2xl font-medium text-fg",
  "hover:bg-border",
  "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
);

const cellClass = cn(
  "flex items-center justify-center rounded-(--radius-btn) border-2 border-transparent",
  "bg-muted py-2 text-xl font-medium text-fg hover:bg-border",
);

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function weekdayLabel(year: number, month: number, day: number) {
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]}요일`;
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month));
}

export default function DesignPage() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);
  const [viewAllMonths, setViewAllMonths] = useState(false);
  const [day, setDay] = useState(24);
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(thisYear);
  const [draftMonth, setDraftMonth] = useState<MonthDraft>(thisMonth);
  const yearListRef = useRef<HTMLDivElement>(null);
  const yearCellRefs = useRef(new Map<number, HTMLButtonElement>());

  const dayCount = daysInMonth(year, month);
  const monthApplyDisabled = viewAllMonths ? draftMonth === "all" : draftMonth === month;

  const scrollYearIntoView = (targetYear: number) => {
    const root = yearListRef.current;
    const target = yearCellRefs.current.get(targetYear);
    if (!root || !target) return;

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    root.scrollTop += targetRect.top - rootRect.top - root.clientHeight / 2 + targetRect.height / 2;
  };

  useEffect(() => {
    if (!yearOpen) return;

    const frame = requestAnimationFrame(() => {
      scrollYearIntoView(year);
    });

    return () => cancelAnimationFrame(frame);
  }, [yearOpen, year]);

  const openYearModal = () => {
    setDraftYear(year);
    setYearOpen(true);
  };

  const closeYearModal = () => {
    setYearOpen(false);
  };

  const goThisYear = () => {
    setDraftYear(thisYear);
    requestAnimationFrame(() => scrollYearIntoView(thisYear));
  };

  const applyYear = () => {
    setYear(draftYear);
    if (!viewAllMonths) setDay((prev) => clampDay(draftYear, month, prev));
    setYearOpen(false);
  };

  const openMonthModal = () => {
    setDraftMonth(viewAllMonths ? "all" : month);
    setMonthOpen(true);
  };

  const closeMonthModal = () => {
    setMonthOpen(false);
  };

  const goThisMonth = () => {
    setDraftMonth(thisMonth);
  };

  const applyMonth = () => {
    if (draftMonth === "all") {
      setViewAllMonths(true);
    } else {
      setViewAllMonths(false);
      setMonth(draftMonth);
      setDay((prev) => clampDay(year, draftMonth, prev));
    }
    setMonthOpen(false);
  };

  return (
    <div className={cn("flex flex-1 flex-col")}>
      {/* 년월 */}
      <div className="m-6 flex items-center gap-2">
        <div className={triggerClass} onClick={openYearModal}>
          {year}년
        </div>
        <div className={triggerClass} onClick={openMonthModal}>
          {viewAllMonths ? "전체" : `${month}월`}
        </div>
      </div>

      <Modal
        open={yearOpen}
        onClose={closeYearModal}
        label="년도 선택"
        size="sm"
        className="overflow-hidden"
      >
        <div className="mb-3 flex items-center gap-2">
          <ModalTitle className="text-md font-medium text-fg">년도</ModalTitle>
          <button
            type="button"
            className="text-sm text-accent hover:text-accent-hover"
            onClick={goThisYear}
          >
            올해로
          </button>
          <Button
            variant="ghost"
            className="ml-auto p-1.5"
            aria-label="닫기"
            onClick={closeYearModal}
          >
            <CloseIcon />
          </Button>
        </div>
        <div ref={yearListRef} className="scrollbar max-h-[min(22rem,60vh)] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {YEARS.map((item) => {
              const selected = item === draftYear;
              const isThisYear = item === thisYear;
              return (
                <button
                  key={item}
                  ref={(node) => {
                    if (node) yearCellRefs.current.set(item, node);
                    else yearCellRefs.current.delete(item);
                  }}
                  type="button"
                  className={cn(cellClass, isThisYear && "text-accent", selected && "border-accent")}
                  onClick={() => setDraftYear(item)}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" disabled={draftYear === year} onClick={applyYear}>
            적용
          </Button>
        </div>
      </Modal>

      <Modal
        open={monthOpen}
        onClose={closeMonthModal}
        label="월 선택"
        size="sm"
        className="overflow-hidden"
      >
        <div className="mb-3 flex items-center gap-2">
          <ModalTitle className="text-md font-medium text-fg">월</ModalTitle>
          <button
            type="button"
            className="text-sm text-accent hover:text-accent-hover"
            onClick={goThisMonth}
          >
            이번 달로
          </button>
          <Button
            variant="ghost"
            className="ml-auto p-1.5"
            aria-label="닫기"
            onClick={closeMonthModal}
          >
            <CloseIcon />
          </Button>
        </div>
        <button
          type="button"
          className={cn(cellClass, "mb-2 w-full py-2.5 text-base", draftMonth === "all" && "border-accent")}
          onClick={() => setDraftMonth("all")}
        >
          전체보기
        </button>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((item) => {
            const selected = draftMonth === item;
            const isThisMonth = year === thisYear && item === thisMonth;
            return (
              <button
                key={item}
                type="button"
                className={cn(cellClass, isThisMonth && "text-accent", selected && "border-accent")}
                onClick={() => setDraftMonth(item)}
              >
                {item}월
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" disabled={monthApplyDisabled} onClick={applyMonth}>
            적용
          </Button>
        </div>
      </Modal>

      {/* 일 */}
      {!viewAllMonths ? (
        <div className={cn("scrollbar flex h-34 gap-2 overflow-x-scroll overflow-hidden")}>
          {Array.from({ length: dayCount }).map((_, index) => {
            const date = index + 1;
            return (
              <Card
                key={date}
                className={cn(
                  "flex h-30 w-20 shrink-0 flex-col items-center justify-center",
                  date === day && "border-accent",
                )}
              >
                <div>{date}</div>
                <div>{weekdayLabel(year, month, date)}</div>
              </Card>
            );
          })}
        </div>
      ) : null}
      <Card className={cn("m-6 flex-1")} />
    </div>
  );
}
