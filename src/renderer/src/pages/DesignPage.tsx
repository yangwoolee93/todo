import { useEffect, useRef, useState, type RefObject } from "react";
import { Button, CloseIcon, DragHandleIcon, Modal, ModalTitle, Tab } from "@renderer/shared/ui";
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

function scrollChildIntoView(
  root: HTMLElement | null,
  target: HTMLElement | null,
  axis: "x" | "y",
) {
  if (!root || !target) return;

  const rootRect = root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  if (axis === "x") {
    root.scrollLeft +=
      targetRect.left - rootRect.left - root.clientWidth / 2 + targetRect.width / 2;
    return;
  }

  root.scrollTop +=
    targetRect.top - rootRect.top - root.clientHeight / 2 + targetRect.height / 2;
}

type TimelineBar = { id: string; label: string; start: number; end: number };

function EmptyHint({ children }: { children: string }) {
  return (
    <p className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}

function isTodayView(
  year: number,
  month: number,
  day: number,
  monthOverview: boolean,
  thisYear: number,
  thisMonth: number,
  thisDay: number,
) {
  return !monthOverview && year === thisYear && month === thisMonth && day === thisDay;
}

function YearMonthHeader({
  year,
  month,
  showGoToday,
  showSample,
  onOpenYear,
  onOpenMonth,
  onGoToday,
  onToggleSample,
}: {
  year: number;
  month: number;
  showGoToday: boolean;
  showSample: boolean;
  onOpenYear: () => void;
  onOpenMonth: () => void;
  onGoToday: () => void;
  onToggleSample: () => void;
}) {
  return (
    <div className="m-6 flex items-center gap-2">
      <div className={triggerClass} onClick={onOpenYear}>
        {year}년
      </div>
      <div className={triggerClass} onClick={onOpenMonth}>
        {month}월
      </div>
      {showGoToday ? (
        <button
          type="button"
          className="text-sm text-accent hover:text-accent-hover"
          onClick={onGoToday}
        >
          오늘로
        </button>
      ) : null}
      <button
        type="button"
        className="ml-auto text-xs text-fg-muted hover:text-fg"
        onClick={onToggleSample}
      >
        {showSample ? "빈 화면 보기" : "시안 데이터 보기"}
      </button>
    </div>
  );
}

function YearPickerModal({
  open,
  year,
  thisYear,
  draftYear,
  listRef,
  cellRefs,
  onClose,
  onGoThisYear,
  onPick,
  onApply,
}: {
  open: boolean;
  year: number;
  thisYear: number;
  draftYear: number;
  listRef: RefObject<HTMLDivElement | null>;
  cellRefs: RefObject<Map<number, HTMLButtonElement>>;
  onClose: () => void;
  onGoThisYear: () => void;
  onPick: (year: number) => void;
  onApply: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label="년도 선택" size="sm" className="overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        <ModalTitle className="text-md font-medium text-fg">년도</ModalTitle>
        <button
          type="button"
          className="text-sm text-accent hover:text-accent-hover"
          onClick={onGoThisYear}
        >
          올해로
        </button>
        <Button variant="ghost" className="ml-auto p-1.5" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>
      <div ref={listRef} className="scrollbar max-h-[min(22rem,60vh)] overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {YEARS.map((item) => {
            const selected = item === draftYear;
            const isThisYear = item === thisYear;
            return (
              <button
                key={item}
                ref={(node) => {
                  if (node) cellRefs.current.set(item, node);
                  else cellRefs.current.delete(item);
                }}
                type="button"
                className={cn(cellClass, isThisYear && "text-accent", selected && "border-accent")}
                onClick={() => onPick(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="primary" disabled={draftYear === year} onClick={onApply}>
          적용
        </Button>
      </div>
    </Modal>
  );
}

function MonthPickerModal({
  open,
  year,
  thisYear,
  thisMonth,
  draftMonth,
  dayViewDisabled,
  monthViewDisabled,
  onClose,
  onGoThisMonth,
  onPick,
  onDayView,
  onMonthView,
}: {
  open: boolean;
  year: number;
  thisYear: number;
  thisMonth: number;
  draftMonth: number;
  dayViewDisabled: boolean;
  monthViewDisabled: boolean;
  onClose: () => void;
  onGoThisMonth: () => void;
  onPick: (month: number) => void;
  onDayView: () => void;
  onMonthView: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label="월 선택" size="sm" className="overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        <ModalTitle className="text-md font-medium text-fg">월</ModalTitle>
        <button
          type="button"
          className="text-sm text-accent hover:text-accent-hover"
          onClick={onGoThisMonth}
        >
          이번 달로
        </button>
        <Button variant="ghost" className="ml-auto p-1.5" aria-label="닫기" onClick={onClose}>
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
              onClick={() => onPick(item)}
            >
              {item}월
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button disabled={monthViewDisabled} onClick={onMonthView}>
          월로 보기
        </Button>
        <Button variant="primary" disabled={dayViewDisabled} onClick={onDayView}>
          일로 보기
        </Button>
      </div>
    </Modal>
  );
}

function DayStrip({
  listRef,
  cellRefs,
  dayCount,
  day,
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  onSelectDay,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  cellRefs: RefObject<Map<number, HTMLButtonElement>>;
  dayCount: number;
  day: number;
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  onSelectDay: (day: number) => void;
}) {
  return (
    <div
      ref={listRef}
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
              if (node) cellRefs.current.set(date, node);
              else cellRefs.current.delete(date);
            }}
            type="button"
            className={cn(
              "flex h-30 w-24 shrink-0 flex-col items-center justify-center rounded-(--radius-card) gap-4",
              "border-2 border-transparent bg-surface",
              "hover:bg-muted",
              isToday && !selected && "text-accent",
              selected && "border-accent bg-accent text-white hover:bg-accent-hover",
            )}
            onClick={() => onSelectDay(date)}
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
  );
}

function DayTodoList({ todos }: { todos: DisplayTodo[] }) {
  return (
    <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
      >
        + 할 일 추가
      </button>
      <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {todos.length === 0 ? (
          <EmptyHint>등록된 할 일이 없습니다.</EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((item) => (
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
        )}
      </div>
    </div>
  );
}

const SAMPLE_TIMELINE_BARS = [
  { id: "a", label: "회의 자료 정리", start: 2, end: 5 },
  { id: "b", label: "장보기", start: 8, end: 8 },
  { id: "c", label: "운동", start: 10, end: 14 },
  { id: "d", label: "청소", start: 5, end: 5 },
  { id: "e", label: "병원", start: 16, end: 16 },
  { id: "f", label: "거래처 견적 메일 회신하고 내일 회의 자료까지 같이 정리하기", start: 18, end: 20 },
  { id: "g", label: "주간 회고", start: 22, end: 22 },
  { id: "h", label: "장보기", start: 24, end: 24 },
  { id: "i", label: "저녁 약속", start: 26, end: 26 },
  { id: "j", label: "주말 일정 정리", start: 28, end: 29 },
  { id: "k", label: "월말 정산", start: 30, end: 31 },
];

function sampleAgendaGroups(bars: TimelineBar[], includeDay?: number) {
  const byDay = new Map<number, string[]>();
  bars.forEach((bar) => {
    for (let day = bar.start; day <= bar.end; day += 1) {
      const list = byDay.get(day) ?? [];
      list.push(bar.label);
      byDay.set(day, list);
    }
  });
  if (includeDay !== undefined && !byDay.has(includeDay)) {
    byDay.set(includeDay, []);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, items]) => ({ day, items }));
}

const DAY_COL_WIDTH = "3rem";

function MonthTimelineDraft({
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  bars,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  bars: TimelineBar[];
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const dayCount = daysInMonth(year, month);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollChildIntoView(scrollRef.current, todayRef.current, "x");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [year, month, thisDay, scrollToTodayTick]);

  return (
    <div ref={scrollRef} className="scrollbar flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="min-w-max">
        <div className="flex">
          {Array.from({ length: dayCount }).map((_, index) => {
            const date = index + 1;
            const isToday = year === thisYear && month === thisMonth && date === thisDay;
            return (
              <button
                key={date}
                ref={isToday ? todayRef : undefined}
                type="button"
                style={{ width: DAY_COL_WIDTH }}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 py-2",
                  isToday && "text-accent",
                )}
                onClick={() => onOpenDay(date)}
              >
                <span className="text-[11px] text-fg-secondary">
                  {WEEKDAYS[new Date(year, month - 1, date).getDay()]}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-(--radius-btn) text-sm font-medium",
                    isToday && "bg-accent text-white",
                  )}
                >
                  {date}
                </span>
              </button>
            );
          })}
        </div>
        {bars.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5 pb-2">
            {bars.map((bar) => (
              <div
                key={bar.id}
                className="relative h-8"
                style={{ width: `calc(${dayCount} * ${DAY_COL_WIDTH})` }}
              >
                <div
                  className="absolute top-0 flex h-8 items-center truncate rounded-(--radius-btn) bg-muted px-2 text-xs text-fg"
                  style={{
                    left: `calc(${bar.start - 1} * ${DAY_COL_WIDTH})`,
                    width: `calc(${bar.end - bar.start + 1} * ${DAY_COL_WIDTH} - 0.25rem)`,
                  }}
                >
                  {bar.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {bars.length === 0 ? <EmptyHint>이 달에 등록된 할 일이 없습니다.</EmptyHint> : null}
    </div>
  );
}

function MonthAgendaDraft({
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  bars,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  bars: TimelineBar[];
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const isCurrentMonth = year === thisYear && month === thisMonth;
  const groups = sampleAgendaGroups(bars, isCurrentMonth ? thisDay : undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollChildIntoView(scrollRef.current, todayRef.current, "y");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [year, month, thisDay, scrollToTodayTick]);

  return (
    <div ref={scrollRef} className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      {groups.length === 0 ? (
        <EmptyHint>이 달에 등록된 할 일이 없습니다.</EmptyHint>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const isToday = isCurrentMonth && group.day === thisDay;
            return (
              <section
                key={group.day}
                ref={isToday ? todayRef : undefined}
                className="flex flex-col gap-2"
              >
                <button
                  type="button"
                  className="flex items-baseline gap-2 text-left"
                  onClick={() => onOpenDay(group.day)}
                >
                  <span className={cn("text-lg font-medium", isToday && "text-accent")}>
                    {group.day}일
                  </span>
                  <span className="text-xs text-fg-secondary">
                    {weekdayLabel(year, month, group.day)}
                  </span>
                </button>
                {group.items.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {group.items.map((title, index) => (
                      <li
                        key={`${group.day}-${index}`}
                        className="rounded-(--radius-card) bg-surface px-3 py-3 font-medium leading-snug text-fg line-clamp-2"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-1 py-2 text-sm text-fg-muted">등록된 할 일이 없습니다.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthOverview({
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  bars,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  bars: TimelineBar[];
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const [mode, setMode] = useState<"timeline" | "agenda">("timeline");

  return (
    <div className="mx-6 mb-6 flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 justify-end gap-1">
        <Tab active={mode === "timeline"} onClick={() => setMode("timeline")}>
          타임라인
        </Tab>
        <Tab active={mode === "agenda"} onClick={() => setMode("agenda")}>
          목록
        </Tab>
      </div>
      {mode === "timeline" ? (
        <MonthTimelineDraft
          year={year}
          month={month}
          thisYear={thisYear}
          thisMonth={thisMonth}
          thisDay={thisDay}
          bars={bars}
          scrollToTodayTick={scrollToTodayTick}
          onOpenDay={onOpenDay}
        />
      ) : (
        <MonthAgendaDraft
          year={year}
          month={month}
          thisYear={thisYear}
          thisMonth={thisMonth}
          thisDay={thisDay}
          bars={bars}
          scrollToTodayTick={scrollToTodayTick}
          onOpenDay={onOpenDay}
        />
      )}
    </div>
  );
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
  const [showSample, setShowSample] = useState(true);
  const [scrollToTodayTick, setScrollToTodayTick] = useState(0);
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

  const goToToday = () => {
    setYear(thisYear);
    setMonth(thisMonth);
    setDay(thisDay);
    if (monthOverview) {
      setScrollToTodayTick((n) => n + 1);
      return;
    }
    setMonthOverview(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 년월 */}
      <YearMonthHeader
        year={year}
        month={month}
        showGoToday={!isTodayView(year, month, day, monthOverview, thisYear, thisMonth, thisDay)}
        showSample={showSample}
        onOpenYear={openYearModal}
        onOpenMonth={openMonthModal}
        onGoToday={goToToday}
        onToggleSample={() => setShowSample((prev) => !prev)}
      />
      {/* 년 모달 */}
      <YearPickerModal
        open={yearOpen}
        year={year}
        thisYear={thisYear}
        draftYear={draftYear}
        listRef={yearListRef}
        cellRefs={yearCellRefs}
        onClose={closeYearModal}
        onGoThisYear={goThisYear}
        onPick={setDraftYear}
        onApply={applyYear}
      />
      {/* 월 모달 */}
      <MonthPickerModal
        open={monthOpen}
        year={year}
        thisYear={thisYear}
        thisMonth={thisMonth}
        draftMonth={draftMonth}
        dayViewDisabled={dayViewDisabled}
        monthViewDisabled={monthViewDisabled}
        onClose={closeMonthModal}
        onGoThisMonth={goThisMonth}
        onPick={setDraftMonth}
        onDayView={applyDayView}
        onMonthView={applyMonthView}
      />
      {monthOverview ? (
        <>
          {/* 월 */}
          <MonthOverview
            year={year}
            month={month}
            thisYear={thisYear}
            thisMonth={thisMonth}
            thisDay={thisDay}
            bars={showSample ? SAMPLE_TIMELINE_BARS : []}
            scrollToTodayTick={scrollToTodayTick}
            onOpenDay={(nextDay) => {
              setDay(nextDay);
              setMonthOverview(false);
            }}
          />
        </>
      ) : (
        <>
          {/* 일 */}
          <DayStrip
            listRef={dayListRef}
            cellRefs={dayCellRefs}
            dayCount={dayCount}
            day={day}
            year={year}
            month={month}
            thisYear={thisYear}
            thisMonth={thisMonth}
            thisDay={thisDay}
            onSelectDay={setDay}
          />
          {/* 일 - 할일 목록 */}
          <DayTodoList todos={showSample ? SAMPLE_TODOS : []} />
        </>
      )}
    </div>
  );
}
