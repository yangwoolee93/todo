import { useEffect, useRef, useState } from "react";
import { Button, CloseIcon, DragHandleIcon, Modal, ModalTitle } from "@renderer/shared/ui";
import { TodoItemMenu, TodoStatusIcon } from "@renderer/features/todo";
import type { DisplayTodo } from "@shared/types/todo";
import { cn } from "@renderer/utils/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEAR_START = 2000;
const YEAR_END = 2040;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => YEAR_START + index);

const triggerClass = cn(
  "w-fit cursor-pointer rounded-(--radius-btn) bg-surface px-3 py-1 text-2xl font-medium text-fg",
  "hover:bg-muted",
  "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
);

const cellClass = cn(
  "flex items-center justify-center rounded-(--radius-btn) border-2 border-transparent",
  "bg-surface py-2 text-xl font-medium text-fg hover:bg-muted",
);

const SAMPLE_TODOS: DisplayTodo[] = [
  {
    id: 1,
    content: "회의 자료 정리",
    status: "pending",
    sort_order: 0,
    created_at: 0,
    batch_id: null,
  },
  { id: 2, content: "장보기", status: "completed", sort_order: 1, created_at: 0, batch_id: null },
  { id: 3, content: "운동", status: "pending", sort_order: 2, created_at: 0, batch_id: null },
  {
    id: 4,
    content: "거래처 견적 메일 회신하고 내일 회의 자료까지 같이 정리하기",
    status: "failed",
    sort_order: 3,
    created_at: 0,
    batch_id: null,
  },

  {
    id: 5,
    content: "거래처 견적 메일 회신하고 내일 회의 자료까지 같이 정리하기",
    status: "failed",
    sort_order: 3,
    created_at: 0,
    batch_id: null,
  },
];

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
  const [monthOverview, setMonthOverview] = useState(false);
  const thisDay = now.getDate();
  const [day, setDay] = useState(thisDay);
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(thisYear);
  const [draftMonth, setDraftMonth] = useState(thisMonth);
  const yearListRef = useRef<HTMLDivElement>(null);
  const yearCellRefs = useRef(new Map<number, HTMLButtonElement>());
  const dayListRef = useRef<HTMLDivElement>(null);
  const dayCellRefs = useRef(new Map<number, HTMLButtonElement>());

  const dayCount = daysInMonth(year, month);
  const sameMonth = draftMonth === month;
  const dayViewDisabled = sameMonth && !monthOverview;
  const monthViewDisabled = sameMonth && monthOverview;

  const scrollYearIntoView = (targetYear: number) => {
    const root = yearListRef.current;
    const target = yearCellRefs.current.get(targetYear);
    if (!root || !target) return;

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    root.scrollTop += targetRect.top - rootRect.top - root.clientHeight / 2 + targetRect.height / 2;
  };

  const scrollDayIntoView = (targetDay: number) => {
    const root = dayListRef.current;
    const target = dayCellRefs.current.get(targetDay);
    if (!root || !target) return;

    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    root.scrollLeft +=
      targetRect.left - rootRect.left - root.clientWidth / 2 + targetRect.width / 2;
  };

  useEffect(() => {
    if (!yearOpen) return;

    const frame = requestAnimationFrame(() => {
      scrollYearIntoView(year);
    });

    return () => cancelAnimationFrame(frame);
  }, [yearOpen, year]);

  useEffect(() => {
    if (monthOverview) return;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollDayIntoView(day);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [day, year, month, monthOverview, dayCount]);

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
    if (!monthOverview) setDay((prev) => clampDay(draftYear, month, prev));
    setYearOpen(false);
  };

  const openMonthModal = () => {
    setDraftMonth(month);
    setMonthOpen(true);
  };

  const closeMonthModal = () => {
    setMonthOpen(false);
  };

  const goThisMonth = () => {
    setDraftMonth(thisMonth);
  };

  const applyDayView = () => {
    setMonth(draftMonth);
    setMonthOverview(false);
    setDay((prev) => clampDay(year, draftMonth, prev));
    setMonthOpen(false);
  };

  const applyMonthView = () => {
    setMonth(draftMonth);
    setMonthOverview(true);
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
          {month}월
        </div>
      </div>
      {/* 년 모달 */}
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
                  className={cn(
                    cellClass,
                    isThisYear && "text-accent",
                    selected && "border-accent",
                  )}
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
      {/* 월 모달 */}
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
        <div className="mt-3 flex justify-end gap-2">
          <Button disabled={monthViewDisabled} onClick={applyMonthView}>
            월로 보기
          </Button>
          <Button variant="primary" disabled={dayViewDisabled} onClick={applyDayView}>
            일로 보기
          </Button>
        </div>
      </Modal>

      {/* 일 */}
      {!monthOverview ? (
        <div
          ref={dayListRef}
          className={cn("scrollbar flex gap-2 overflow-x-scroll overflow-y-hidden pb-1.5")}
        >
          {Array.from({ length: dayCount }).map((_, index) => {
            const date = index + 1;
            const selected = date === day;
            const isToday = year === thisYear && month === thisMonth && date === thisDay;
            return (
              <button
                key={date}
                ref={(node) => {
                  if (node) dayCellRefs.current.set(date, node);
                  else dayCellRefs.current.delete(date);
                }}
                type="button"
                className={cn(
                  "flex h-30 w-24 shrink-0 flex-col items-center justify-center rounded-(--radius-card) gap-4",
                  "border-2 border-transparent bg-surface",
                  "hover:bg-muted",
                  isToday && !selected && "text-accent",
                  selected && "border-accent bg-accent text-white hover:bg-accent-hover",
                )}
                onClick={() => setDay(date)}
              >
                <span className="text-3xl font-bold leading-none">{date}</span>
                <span
                  className={cn(
                    "mt-1 text-[0.75rem] font-normal",
                    selected ? "text-white/80" : "text-fg-secondary",
                  )}
                >
                  {weekdayLabel(year, month, date)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {/* 일 - 할일 목록 */}
      {!monthOverview ? (
        <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
          <button
            type="button"
            className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
          >
            + 할 일 추가
          </button>
          <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
            <ul className="flex flex-col gap-2">
              {SAMPLE_TODOS.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-(--radius-card) bg-surface px-3 py-3"
                >
                  <Button
                    variant="ghost"
                    className="shrink-0 cursor-grab px-1 py-1 text-fg-muted opacity-30 hover:text-fg group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-label="순서 변경"
                  >
                    <DragHandleIcon />
                  </Button>
                  <span className="shrink-0 p-0.5">
                    <TodoStatusIcon status={item.status} />
                  </span>
                  <span className="min-w-0 flex-1 text-left font-medium leading-snug text-fg line-clamp-2">
                    {item.content}
                  </span>
                  <div className="opacity-30 group-hover:opacity-100 group-focus-within:opacity-100">
                    <TodoItemMenu
                      todo={item}
                      onEdit={() => undefined}
                      onDuplicate={() => undefined}
                      onDelete={() => undefined}
                      onSetStatus={() => undefined}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {/* 월 - 타임라인 or 보더 - 고민중 */}
    </div>
  );
}
