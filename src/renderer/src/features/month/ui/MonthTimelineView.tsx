import { useEffect, useRef } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { toShortLabel } from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { Button } from "@renderer/shared/ui";
import type { MonthDayViewProps } from "./monthViewTypes";

/** 월별 타임라인 — 가로 스크롤 Gantt 스타일 */
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

  const dayWidth = 88; // px, 날짜 칸 너비
  const trackWidth = summaries.length * dayWidth;

  // 오늘이 몇 번째 칸인지
  const todayIndex = summaries.findIndex((d) => d.date === today);
  const selectedIndex = selectedDate ? summaries.findIndex((d) => d.date === selectedDate) : -1;

  // 오늘로 스크롤 (가로 + 세로)
  const scrollToToday = () => {
    if (scrollToTodayTick === 0 || todayIndex < 0 || !scrollRef.current) return;
    const container = scrollRef.current;
    const left = todayIndex * dayWidth;
    const target = left - container.clientWidth / 2 + dayWidth / 2;
    container.scrollLeft = Math.max(0, target);

    if (todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "center", inline: "nearest" });
    } else {
      todayHeaderRef.current?.scrollIntoView({
        block: "nearest",
        inline: "center",
      });
    }
  };

  useEffect(() => {
    if (summaries.length === 0 || !scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
    scrollToToday();
  }, [summaries]);

  // 오늘로 스크롤 선택
  useEffect(() => {
    scrollToToday();
  }, [scrollToTodayTick, todayIndex]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 본문 스크롤 영역 */}
      <div ref={scrollRef} className="scrollbar min-h-0 flex-1 overflow-auto pb-2">
        {/* 스크롤 내부 컨테이너 */}
        <div className="inline-block align-top" style={{ minWidth: trackWidth }}>
          {/* 헤더: 날짜 칸 */}
          <div className="sticky top-0 z-20 border-b border-border bg-surface">
            <div className="relative shrink-0" style={{ width: trackWidth, height: 36 }}>
              {summaries.map((day, index) => {
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onDateClick(day.date);
                      }
                    }}
                    style={{
                      position: "absolute",
                      left: index * dayWidth,
                      width: dayWidth,
                      top: 0,
                      bottom: 0,
                    }}
                    className={cn(
                      "flex items-center justify-center border-r border-border text-center text-sm tabular-nums transition-colors hover:bg-muted/40 cursor-pointer",
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

          {/* 본문: 할 일들 */}
          <div className="relative shrink-0 bg-muted/5" style={{ width: trackWidth }}>
            {/* 오늘/선택 배경 (한 번만 그리기) */}
            {todayIndex >= 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-accent-soft/25"
                style={{
                  left: todayIndex * dayWidth,
                  width: dayWidth,
                }}
              />
            )}
            {selectedIndex >= 0 && selectedIndex !== todayIndex && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-muted/30"
                style={{
                  left: selectedIndex * dayWidth,
                  width: dayWidth,
                }}
              />
            )}

            {/* 할 일 행들 */}
            {summaries.every((s) => s.todos.length === 0) ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                이 달에 등록된 할 일이 없습니다.
              </p>
            ) : (
              <div>
                {summaries.map((day, dayIndex) =>
                  day.todos.map((todo, todoIndex) => {
                    const isFirstTodayTodo = day.date === today && todoIndex === 0;
                    return (
                      <div
                        key={`${day.date}-${todo.id}`}
                        ref={isFirstTodayTodo ? todayRowRef : undefined}
                        className="border-b border-border/80 p-1"
                      >
                        <div
                          className="relative cursor-pointer text-sm leading-snug"
                          style={{ marginLeft: dayIndex * dayWidth }}
                          onClick={() => onDateClick(day.date)}
                        >
                          <div
                            className={cn(
                              "rounded border border-border/90 bg-surface shadow-sm px-2 py-1",
                              getTodoTextClass(todo.status),
                            )}
                            style={{ maxWidth: dayWidth - 8 }}
                          >
                            <span className="whitespace-nowrap block">{todo.content}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
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
