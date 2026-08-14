import { useEffect, useMemo, useRef } from "react";
import type { DisplayTodo } from "@shared/types/todo";
import { toShortLabel } from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { Button } from "@renderer/shared/ui";
import type { MonthDayViewProps } from "./monthViewTypes";
import { onDayActivateKey } from "./onDayActivateKey";
import { buildTimelineRows } from "./buildTimelineRows";

/** 날짜 칸 너비 (px) */
const DAY_WIDTH = 88;
/** sticky 헤더 높이 */
const HEADER_HEIGHT = 40;

/** 기간 막대 안 날짜 칸 배경 */
function segmentBgClass(todo: DisplayTodo | null): string {
  if (!todo) {
    return "bg-transparent";
  }
  if (todo.status === "completed") {
    return "border-t border-success bg-muted/80";
  }
  if (todo.status === "failed") {
    return "border-t border-failed bg-muted/80";
  }
  return "bg-transparent border-t border-muted/80";
}

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

  const todoRows = useMemo(() => buildTimelineRows(summaries), [summaries]);
  const todayRowKey = todoRows.find((row) =>
    row.cells.some((cell) => cell.date === today && cell.todo),
  )?.key;

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
      <div ref={scrollRef} className="scrollbar min-h-0 flex-1 overflow-auto">
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
                      isToday && "font-semibold",
                      isToday && !isSelected && "bg-muted text-fg",
                      isSelected && "bg-accent/15 text-accent",
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
          <div className="relative shrink-0" style={{ width: trackWidth }}>
            {todayIndex >= 0 && selectedIndex !== todayIndex && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-muted/40"
                style={{
                  left: todayIndex * DAY_WIDTH,
                  width: DAY_WIDTH,
                }}
              />
            )}
            {selectedIndex >= 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 bg-accent/10"
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
                {todoRows.map((row) => (
                  <div
                    key={row.key}
                    ref={row.key === todayRowKey ? todayRowRef : undefined}
                    className={cn("relative border-b border-border/80 py-1")}
                  >
                    <div
                      className="relative overflow-visible"
                      style={{
                        marginLeft: row.startIndex * DAY_WIDTH,
                        width: row.cells.length * DAY_WIDTH,
                        minWidth: row.cells.length * DAY_WIDTH,
                        maxWidth: row.cells.length * DAY_WIDTH,
                      }}
                    >
                      <div className="flex overflow-hidden rounded border border-border/90 bg-surface shadow-sm">
                        {row.cells.map((cell) => (
                          <div
                            key={`${row.key}-${cell.date}`}
                            role="button"
                            tabIndex={0}
                            aria-label={
                              cell.todo
                                ? `${toShortLabel(cell.date)} ${row.content}`
                                : `${toShortLabel(cell.date)} (없음)`
                            }
                            className={cn(
                              "h-8 shrink-0 cursor-pointer transition-colors",
                              "",
                              segmentBgClass(cell.todo),
                            )}
                            style={{ width: DAY_WIDTH }}
                            onClick={() => onDateClick(cell.date)}
                            onKeyDown={(event) => onDayActivateKey(event, cell.date, onDateClick)}
                          />
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-0 overflow-visible">
                        <p className="sticky left-0 z-10 flex h-8 w-max items-center px-2 text-sm leading-snug text-fg">
                          <span
                            className={cn(
                              "whitespace-nowrap",
                              row.isSettled && "line-through text-fg-secondary",
                            )}
                          >
                            {row.content}
                          </span>
                        </p>
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
        <div className="flex shrink-0 justify-end border-t border-border px-4 py-3">
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
