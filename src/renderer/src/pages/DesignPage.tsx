import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  Button,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DragHandleIcon,
  Modal,
  ModalTitle,
  Tab,
} from "@renderer/shared/ui";
import { TodoItemMenu, TodoStatusIcon } from "@renderer/features/todo";
import { buildTimelineRows } from "@renderer/features/month/ui/buildTimelineRows";
import type { DaySummary, DisplayTodo } from "@shared/types/todo";
import { formatDate } from "@renderer/utils/dateUtils";
import { isKoreanPublicHoliday } from "@renderer/utils/koreanHolidays";
import { cn } from "@renderer/utils/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEAR_START = 2000;
const YEAR_END = 2040;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => YEAR_START + index);

type TimelineBar = { id: string; label: string; start: number; end: number };

function toYearMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function barsFromSummaries(summaries: DaySummary[]): TimelineBar[] {
  return buildTimelineRows(summaries).map((row) => ({
    id: row.key,
    label: row.content,
    start: row.startIndex + 1,
    end: row.startIndex + row.cells.length,
  }));
}

function agendaGroupsFromSummaries(summaries: DaySummary[], includeDay?: number) {
  return summaries
    .filter((item) => item.todos.length > 0 || item.day === includeDay)
    .map((item) => ({
      day: item.day,
      items: item.todos.map((todo) => todo.content),
    }));
}

const triggerClass = cn(
  "w-fit cursor-pointer rounded-(--radius-btn) bg-surface px-3 py-1 text-2xl font-medium text-fg",
  "hover:bg-muted",
  "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
);

const cellClass = cn(
  "flex items-center justify-center rounded-(--radius-btn) border-2 border-transparent",
  "bg-surface py-2 text-xl font-medium text-fg hover:bg-muted",
);

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function weekdayLabel(year: number, month: number, day: number) {
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]}요일`;
}

function dateHeadTextClass(year: number, month: number, day: number) {
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || isKoreanPublicHoliday(year, month, day)) return "text-danger";
  if (weekday === 6) return "text-accent";
  return undefined;
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month));
}

function shiftYearMonth(year: number, month: number, deltaMonths: number) {
  const next = new Date(year, month - 1 + deltaMonths, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

function canShiftYearMonth(year: number, month: number, deltaMonths: number) {
  const next = shiftYearMonth(year, month, deltaMonths);
  return next.year >= YEAR_START && next.year <= YEAR_END;
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

  root.scrollTop += targetRect.top - rootRect.top - root.clientHeight / 2 + targetRect.height / 2;
}

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
  showMonth,
  showGoToday,
  onOpenYear,
  onOpenMonthView,
  onGoToday,
}: {
  year: number;
  month: number;
  showMonth: boolean;
  showGoToday: boolean;
  onOpenYear: () => void;
  onOpenMonthView: () => void;
  onGoToday: () => void;
}) {
  return (
    <div className="m-6 flex items-center gap-2">
      <div className={triggerClass} onClick={onOpenYear}>
        {year}년
      </div>
      {showMonth ? (
        <div className={triggerClass} onClick={onOpenMonthView}>
          {month}월
        </div>
      ) : null}
      {showGoToday ? (
        <button
          type="button"
          className="text-sm text-accent hover:text-accent-hover"
          onClick={onGoToday}
        >
          오늘로
        </button>
      ) : null}
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

function StripArrow({
  direction,
  disabled,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-full w-4 shrink-0 items-center justify-center rounded-sm text-fg-secondary",
        "hover:bg-muted hover:text-fg",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
      onClick={onClick}
    >
      {direction === "prev" ? (
        <ChevronLeftIcon className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRightIcon className="h-4 w-4 shrink-0" />
      )}
    </button>
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
  canPrev,
  canNext,
  onSelectDay,
  onPrev,
  onNext,
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
  canPrev: boolean;
  canNext: boolean;
  onSelectDay: (day: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-2">
      <div className="flex h-30 shrink-0 items-center">
        <StripArrow direction="prev" disabled={!canPrev} label="전달" onClick={onPrev} />
      </div>
      <div
        ref={listRef}
        className="scrollbar min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-gutter-stable pb-1"
      >
        <div className="flex h-30 gap-2">
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
      </div>
      <div className="flex h-30 shrink-0 items-center">
        <StripArrow direction="next" disabled={!canNext} label="다음 달" onClick={onNext} />
      </div>
    </div>
  );
}

function MonthStrip({
  listRef,
  cellRefs,
  year,
  month,
  thisYear,
  thisMonth,
  canPrev,
  canNext,
  onSelectMonth,
  onPrev,
  onNext,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  cellRefs: RefObject<Map<number, HTMLButtonElement>>;
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  canPrev: boolean;
  canNext: boolean;
  onSelectMonth: (month: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-2">
      <div className="flex h-30 shrink-0 items-center">
        <StripArrow direction="prev" disabled={!canPrev} label="전년" onClick={onPrev} />
      </div>
      <div
        ref={listRef}
        className="scrollbar min-w-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-gutter-stable pb-1"
      >
        <div className="flex h-30 gap-2">
          {MONTHS.map((item) => {
            const selected = item === month;
            const isThisMonth = year === thisYear && item === thisMonth;
            return (
              <button
                key={item}
                ref={(node) => {
                  if (node) cellRefs.current.set(item, node);
                  else cellRefs.current.delete(item);
                }}
                type="button"
                className={cn(
                  "flex h-30 w-24 shrink-0 flex-col items-center justify-center rounded-(--radius-card) gap-4",
                  "border-2 border-transparent bg-surface",
                  "hover:bg-muted",
                  isThisMonth && !selected && "text-accent",
                  selected && "border-accent bg-accent text-white hover:bg-accent-hover",
                )}
                onClick={() => onSelectMonth(item)}
              >
                <span className="text-3xl font-bold leading-none">{item}</span>
                <span
                  className={cn(
                    "mt-1 text-[0.75rem] font-normal",
                    selected ? "text-white/80" : "text-fg-secondary",
                  )}
                >
                  월
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex h-30 shrink-0 items-center">
        <StripArrow direction="next" disabled={!canNext} label="다음 해" onClick={onNext} />
      </div>
    </div>
  );
}

function DayTodoList({ todos, ready }: { todos: DisplayTodo[]; ready: boolean }) {
  return (
    <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
      >
        + 할 일 추가
      </button>
      <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!ready ? null : todos.length === 0 ? (
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

const DAY_COL_WIDTH = "4rem";
const BAR_EDGE = "0.25rem";

function barTitleSide(start: number, end: number, dayCount: number) {
  if (start === 1 && end === dayCount) return "inside";
  if (end === dayCount) return "right";
  return "left";
}

function MonthTimelineDraft({
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  bars,
  ready,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  bars: TimelineBar[];
  ready: boolean;
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const dayCount = daysInMonth(year, month);
  const trackWidth = `calc(${dayCount} * ${DAY_COL_WIDTH})`;
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
    <div ref={scrollRef} className="scrollbar min-h-0 flex-1 overflow-auto">
      <div className="inline-block align-top" style={{ minWidth: trackWidth }}>
        <div className="sticky top-0 z-20 border-b border-border bg-base" style={{ width: trackWidth }}>
          <div className="flex">
            {Array.from({ length: dayCount }).map((_, index) => {
              const date = index + 1;
              const isToday = year === thisYear && month === thisMonth && date === thisDay;
              const headColor = dateHeadTextClass(year, month, date);
              return (
                <button
                  key={date}
                  ref={isToday ? todayRef : undefined}
                  type="button"
                  style={{ width: DAY_COL_WIDTH }}
                  className="flex shrink-0 flex-col items-center gap-0.5 border-r border-border/50 py-2"
                  onClick={() => onOpenDay(date)}
                >
                  <span className={cn("text-[0.75rem]", headColor ?? "text-fg-secondary")}>
                    {WEEKDAYS[new Date(year, month - 1, date).getDay()]}
                  </span>
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-(--radius-btn) text-lg font-medium",
                      isToday ? "bg-accent text-white" : headColor,
                    )}
                  >
                    {date}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {ready && bars.length > 0 ? (
          <div className="relative" style={{ width: trackWidth }}>
            <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
              {Array.from({ length: dayCount }).map((_, index) => (
                <div
                  key={index}
                  style={{ width: DAY_COL_WIDTH }}
                  className="shrink-0 border-r border-border/50"
                />
              ))}
            </div>
            <div className="relative flex flex-col gap-2 pb-2">
              {bars.map((bar) => {
                const titleSide = barTitleSide(bar.start, bar.end, dayCount);
                return (
                  <div key={bar.id} className="flex" style={{ width: trackWidth }}>
                    <div
                      className={cn(
                        "relative shrink-0 rounded-(--radius-card) bg-surface px-3 py-3",
                        titleSide === "inside" ? "overflow-hidden" : "overflow-visible",
                      )}
                      style={{
                        marginLeft: `calc(${bar.start - 1} * ${DAY_COL_WIDTH} + ${BAR_EDGE})`,
                        width: `calc(${bar.end - bar.start + 1} * ${DAY_COL_WIDTH} - ${BAR_EDGE} - ${BAR_EDGE})`,
                      }}
                    >
                      <span className="invisible font-medium leading-snug">&nbsp;</span>
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-0",
                          titleSide === "inside" ? "overflow-hidden" : "overflow-visible",
                          titleSide === "right" && "flex justify-end",
                        )}
                      >
                        <p
                          className={cn(
                            "flex h-full w-max items-center px-3 font-medium leading-snug text-fg",
                            titleSide === "left" && "sticky left-0",
                            titleSide === "right" && "sticky right-0",
                            titleSide === "inside" && "sticky left-0 max-w-full",
                          )}
                        >
                          <span
                            className={cn(
                              "whitespace-nowrap",
                              titleSide === "inside" && "truncate",
                            )}
                          >
                            {bar.label}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {ready && bars.length === 0 ? <EmptyHint>이 달에 등록된 할 일이 없습니다.</EmptyHint> : null}
    </div>
  );
}

function MonthAgendaDraft({
  year,
  month,
  thisYear,
  thisMonth,
  thisDay,
  summaries,
  ready,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  summaries: DaySummary[];
  ready: boolean;
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const isCurrentMonth = year === thisYear && month === thisMonth;
  const groups = agendaGroupsFromSummaries(summaries, isCurrentMonth ? thisDay : undefined);
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
      {!ready ? null : groups.length === 0 ? (
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
  summaries,
  ready,
  scrollToTodayTick,
  onOpenDay,
}: {
  year: number;
  month: number;
  thisYear: number;
  thisMonth: number;
  thisDay: number;
  summaries: DaySummary[];
  ready: boolean;
  scrollToTodayTick: number;
  onOpenDay: (day: number) => void;
}) {
  const [mode, setMode] = useState<"timeline" | "agenda">("timeline");
  const bars = barsFromSummaries(summaries);

  return (
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
        <MonthTimelineDraft
          year={year}
          month={month}
          thisYear={thisYear}
          thisMonth={thisMonth}
          thisDay={thisDay}
          bars={bars}
          ready={ready}
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
          summaries={summaries}
          ready={ready}
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
  const [draftYear, setDraftYear] = useState(thisYear);
  const [scrollToTodayTick, setScrollToTodayTick] = useState(0);
  const [dayTodos, setDayTodos] = useState<DisplayTodo[]>([]);
  const [dayReady, setDayReady] = useState(false);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [monthReady, setMonthReady] = useState(false);
  const yearListRef = useRef<HTMLDivElement>(null);
  const yearCellRefs = useRef(new Map<number, HTMLButtonElement>());
  const dayListRef = useRef<HTMLDivElement>(null);
  const dayCellRefs = useRef(new Map<number, HTMLButtonElement>());
  const monthListRef = useRef<HTMLDivElement>(null);
  const monthCellRefs = useRef(new Map<number, HTMLButtonElement>());

  const dayCount = daysInMonth(year, month);
  const canPrevMonth = canShiftYearMonth(year, month, -1);
  const canNextMonth = canShiftYearMonth(year, month, 1);
  const canPrevYear = year > YEAR_START;
  const canNextYear = year < YEAR_END;

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

  const scrollMonthIntoView = (targetMonth: number) => {
    const root = monthListRef.current;
    const target = monthCellRefs.current.get(targetMonth);
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

  useLayoutEffect(() => {
    if (monthOverview) return;
    scrollDayIntoView(day);
  }, [day, year, month, monthOverview, dayCount]);

  useLayoutEffect(() => {
    if (!monthOverview) return;
    scrollMonthIntoView(month);
  }, [month, year, monthOverview]);

  useEffect(() => {
    let cancelled = false;
    const date = formatDate(new Date(year, month - 1, day));
    setDayReady(false);

    void window.api.getTodosByDate(date).then((result) => {
      if (cancelled) return;
      setDayTodos(result.success ? (result.data ?? []) : []);
      setDayReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [year, month, day]);

  useEffect(() => {
    let cancelled = false;
    const yearMonth = toYearMonthKey(year, month);
    setMonthReady(false);

    void window.api.getMonthSummary(yearMonth).then((result) => {
      if (cancelled) return;
      setSummaries(result.success ? (result.data ?? []) : []);
      setMonthReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

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
    setDay((prev) => clampDay(draftYear, month, prev));
    setYearOpen(false);
  };

  const openMonthView = () => {
    setMonthOverview(true);
  };

  const goToMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay((prev) => clampDay(nextYear, nextMonth, prev));
  };

  const goPrevMonth = () => {
    if (!canPrevMonth) return;
    const next = shiftYearMonth(year, month, -1);
    goToMonth(next.year, next.month);
  };

  const goNextMonth = () => {
    if (!canNextMonth) return;
    const next = shiftYearMonth(year, month, 1);
    goToMonth(next.year, next.month);
  };

  const goPrevYear = () => {
    if (!canPrevYear) return;
    goToMonth(year - 1, month);
  };

  const goNextYear = () => {
    if (!canNextYear) return;
    goToMonth(year + 1, month);
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
        showMonth={!monthOverview}
        showGoToday={!isTodayView(year, month, day, monthOverview, thisYear, thisMonth, thisDay)}
        onOpenYear={openYearModal}
        onOpenMonthView={openMonthView}
        onGoToday={goToToday}
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
      {monthOverview ? (
        <>
          {/* 월 줄 */}
          <MonthStrip
            listRef={monthListRef}
            cellRefs={monthCellRefs}
            year={year}
            month={month}
            thisYear={thisYear}
            thisMonth={thisMonth}
            canPrev={canPrevYear}
            canNext={canNextYear}
            onSelectMonth={(nextMonth) => goToMonth(year, nextMonth)}
            onPrev={goPrevYear}
            onNext={goNextYear}
          />
          {/* 월 */}
          <MonthOverview
            year={year}
            month={month}
            thisYear={thisYear}
            thisMonth={thisMonth}
            thisDay={thisDay}
            summaries={summaries}
            ready={monthReady}
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
            canPrev={canPrevMonth}
            canNext={canNextMonth}
            onSelectDay={setDay}
            onPrev={goPrevMonth}
            onNext={goNextMonth}
          />
          {/* 일 - 할일 목록 */}
          <DayTodoList todos={dayTodos} ready={dayReady} />
        </>
      )}
    </div>
  );
}
