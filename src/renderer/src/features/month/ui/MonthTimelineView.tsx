import { useEffect, useMemo, useRef } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { toShortLabel } from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { Button } from "@renderer/shared/ui";
import type { MonthDayViewProps } from "./monthViewTypes";
import { barGeometry, buildTimelineBars, indexForDate } from "./buildTimelineBars";

/** 날짜 축 1칸 너비 (px) — 헤더·막대 위치 공통 */
export const TIMELINE_DAY_WIDTH_PX = 88;

/**
 * 월별 타임라인 — 트랙 + 막대 (docs/month-timeline.md)
 */
export default function MonthTimelineView({
  summaries,
  today,
  selectedDate,
  onDateClick,
  onGoToDate,
  scrollToTodayTick,
}: MonthDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayHeaderRef = useRef<HTMLButtonElement>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);
  const bars = useMemo(() => buildTimelineBars(summaries), [summaries]);
  const trackWidthPx = summaries.length * TIMELINE_DAY_WIDTH_PX;
  const todayIndex = indexForDate(summaries, today);
  const selectedIndex = selectedDate ? indexForDate(summaries, selectedDate) : -1;
  const todayBarKey = useMemo(() => {
    const bar = bars.find((b) => b.startDate <= today && b.endDate >= today);
    return bar?.key ?? null;
  }, [bars, today]);

  useEffect(() => {
    if (summaries.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;
    container.scrollLeft = 0;
  }, [summaries]);

  useEffect(() => {
    if (scrollToTodayTick === 0 || todayIndex < 0) return;
    const container = scrollRef.current;
    if (container) {
      const left = todayIndex * TIMELINE_DAY_WIDTH_PX;
      const target =
        left - container.clientWidth / 2 + TIMELINE_DAY_WIDTH_PX / 2;
      container.scrollLeft = Math.max(0, target);
    }
    if (todayRowRef.current) {
      todayRowRef.current.scrollIntoView({ block: "center", inline: "nearest" });
    } else {
      todayHeaderRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [scrollToTodayTick, summaries, todayIndex]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="scrollbar scrollbar-y-inset min-h-0 flex-1 overflow-auto pb-2"
      >
        <div className="inline-block align-top" style={{ minWidth: trackWidthPx }}>
          <div className="sticky top-0 z-20 border-b border-border bg-surface">
            <div className="relative shrink-0" style={{ width: trackWidthPx, height: 36 }}>
              {summaries.map((day, index) => {
                const isToday = day.date === today;
                const isSelected = selectedDate === day.date;
                return (
                  <button
                    key={day.date}
                    ref={isToday ? todayHeaderRef : undefined}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={toShortLabel(day.date)}
                    onClick={() => onDateClick(day.date)}
                    style={{
                      position: "absolute",
                      left: index * TIMELINE_DAY_WIDTH_PX,
                      width: TIMELINE_DAY_WIDTH_PX,
                      top: 0,
                      bottom: 0,
                    }}
                    className={cn(
                      "border-r border-border text-center text-[10px] tabular-nums transition-colors hover:bg-muted/40",
                      isToday && "bg-accent-soft font-semibold text-fg",
                      isSelected && !isToday && "bg-muted/60",
                      !isToday && !isSelected && "text-fg-secondary",
                    )}
                  >
                    {toShortLabel(day.date)}
                  </button>
                );
              })}
            </div>
          </div>

          {bars.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-muted">
              이 달에 등록된 할 일이 없습니다.
            </p>
          ) : (
            bars.map((bar) => {
              const { left, width: spanWidth } = barGeometry(
                bar.startIndex,
                bar.endIndex,
                TIMELINE_DAY_WIDTH_PX,
              );
              return (
                <div
                  key={bar.key}
                  ref={bar.key === todayBarKey ? todayRowRef : undefined}
                  className="overflow-visible border-b border-border/80 py-1"
                >
                  <div
                    className="relative shrink-0 overflow-visible bg-muted/5"
                    style={{ width: trackWidthPx }}
                  >
                    {todayIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute inset-y-0 bg-accent-soft/25"
                        style={{
                          left: todayIndex * TIMELINE_DAY_WIDTH_PX,
                          width: TIMELINE_DAY_WIDTH_PX,
                        }}
                      />
                    )}
                    {selectedIndex >= 0 && selectedIndex !== todayIndex && (
                      <div
                        className="pointer-events-none absolute inset-y-0 bg-muted/30"
                        style={{
                          left: selectedIndex * TIMELINE_DAY_WIDTH_PX,
                          width: TIMELINE_DAY_WIDTH_PX,
                        }}
                      />
                    )}
                    <div
                      className="relative"
                      style={{ marginLeft: left, height: "1.625rem" }}
                    >
                      <div
                        role="presentation"
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 rounded border border-border/90 bg-surface shadow-sm"
                        style={{ width: spanWidth, maxWidth: spanWidth }}
                      />
                      <div
                        role="presentation"
                        className={cn(
                          "relative z-[1] cursor-default py-1 pl-2 text-left text-xs leading-none",
                          getTodoTextClass(bar.status),
                        )}
                        onClick={() => onDateClick(bar.startDate)}
                      >
                        <span className="whitespace-nowrap">{bar.content}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedDate && (
        <div className="flex shrink-0 justify-end border-t border-border pt-2">
          <Button
            variant="primary"
            className="py-1 text-xs"
            onClick={() => onGoToDate(selectedDate)}
          >
            {toShortLabel(selectedDate)} — 오늘 탭으로 이동
          </Button>
        </div>
      )}
    </div>
  );
}
