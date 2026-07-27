import { useEffect, useRef } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { toShortLabel } from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { Button } from "@renderer/shared/ui";
import type { MonthDayViewProps } from "./monthViewTypes";
import { onDayActivateKey } from "./onDayActivateKey";

/** 날짜 칸 너비 (px) */
const DAY_WIDTH = 88;
/** 할 일 박스 좌우 여유 (패딩·테두리 감안) */
const DAY_ITEM_INSET = 8;
/** 할 일 박스 최대 너비 */
const DAY_ITEM_MAX_WIDTH = DAY_WIDTH - DAY_ITEM_INSET;
/** sticky 헤더 높이 */
const HEADER_HEIGHT = 40;

/** 월별 타임라인 — 가로 스크롤 */
export default function MonthTimelineView({
  summaries,
  today,
  selectedDate,
  onDateClick,
  onGoToDate,
  scrollToTodayTick,
}: MonthDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayHeaderRef = useRef<HTMLDivElement>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);

  const trackWidth = summaries.length * DAY_WIDTH;

  // 오늘이 몇 번째 칸인지 (이번 달에 오늘이 있을 때만 >= 0)
  const todayIndex = summaries.findIndex((d) => d.date === today);
  const selectedIndex = selectedDate ? summaries.findIndex((d) => d.date === selectedDate) : -1;

  const todoRows = summaries.flatMap((day, dayIndex) =>
    day.todos.map((todo, todoIndex) => ({
      day,
      dayIndex,
      todo,
      isFirstTodayTodo: day.date === today && todoIndex === 0,
    })),
  );

  // 오늘로 스크롤 (가로 + 세로). todayIndex < 0 이면 다른 달 → 스킵
  const scrollToToday = () => {
    if (scrollToTodayTick === 0 || todayIndex < 0 || !scrollRef.current) return;
    const container = scrollRef.current;
    const left = todayIndex * DAY_WIDTH;
    const target = left - container.clientWidth / 2 + DAY_WIDTH / 2;
    container.scrollLeft = Math.max(0, target);

    if (todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "center", inline: "nearest" });
    } else {
      // 오늘 할 일 없음 → 헤더 칸으로 (이번 달만 여기까지 옴)
      todayHeaderRef.current?.scrollIntoView({
        block: "center",
        inline: "center",
      });
    }
  };

  useEffect(() => {
    if (summaries.length === 0 || !scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
    scrollToToday();
  }, [summaries]);

  useEffect(() => {
    scrollToToday();
  }, [scrollToTodayTick, todayIndex]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="scrollbar min-h-0 flex-1 overflow-auto pb-2">
        <div className="inline-block align-top" style={{ minWidth: trackWidth }}>
          {/* 헤더: flex 날짜 칸 */}
          <div className="sticky top-0 z-20 border-b border-border bg-surface">
            <div className="flex shrink-0" style={{ width: trackWidth, height: HEADER_HEIGHT }}>
              {summaries.map((day) => {
                const isToday = day.date === today;
                const isSelected = selectedDate === day.date;
                return (
                  <div
                    key={day.date}
                    ref={isToday ? todayHeaderRef : undefined}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={toShortLabel(day.date)}
                    onClick={() => onDateClick(day.date)}
                    onKeyDown={(event) => onDayActivateKey(event, day.date, onDateClick)}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center justify-center border-r border-border text-center text-sm tabular-nums transition-colors hover:bg-muted/40",
                      isToday && "bg-accent-soft font-semibold text-fg",
                      isSelected && !isToday && "bg-muted/60",
                      !isToday && !isSelected && "text-fg-secondary",
                    )}
                  >
                    {toShortLabel(day.date)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 본문 */}
          <div className="relative shrink-0 bg-muted/5" style={{ width: trackWidth }}>
            {todayIndex >= 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-accent-soft/25"
                style={{
                  left: todayIndex * DAY_WIDTH,
                  width: DAY_WIDTH,
                }}
              />
            )}
            {selectedIndex >= 0 && selectedIndex !== todayIndex && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-muted/30"
                style={{
                  left: selectedIndex * DAY_WIDTH,
                  width: DAY_WIDTH,
                }}
              />
            )}

            {todoRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                이 달에 등록된 할 일이 없습니다.
              </p>
            ) : (
              <div>
                {todoRows.map(({ day, dayIndex, todo, isFirstTodayTodo }) => (
                  <div
                    key={`${day.date}-${todo.id}`}
                    ref={isFirstTodayTodo ? todayRowRef : undefined}
                    className="border-b border-border/80 p-1"
                  >
                    <div
                      className="relative cursor-pointer text-sm leading-snug"
                      style={{ marginLeft: dayIndex * DAY_WIDTH }}
                      onClick={() => onDateClick(day.date)}
                    >
                      <div
                        className={cn(
                          "rounded border border-border/90 bg-surface px-2 py-1 shadow-sm",
                          getTodoTextClass(todo.status),
                        )}
                        style={{ maxWidth: DAY_ITEM_MAX_WIDTH }}
                      >
                        <span className="block whitespace-nowrap">{todo.content}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="flex shrink-0 justify-end border-t border-border pt-2">
          <Button
            variant="primary"
            className="py-1 text-sm"
            onClick={() => onGoToDate(selectedDate)}
          >
            {toShortLabel(selectedDate)} — 오늘 탭으로 이동
          </Button>
        </div>
      )}
    </div>
  );
}
