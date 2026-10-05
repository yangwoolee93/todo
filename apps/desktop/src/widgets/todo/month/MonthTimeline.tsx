import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAY_COL_WIDTH } from "./constants";
import { DaySummary } from "@shared/types/todo";
import { cn } from "@renderer/utils/cn";
import {
  isChildGroupOpen,
  setChildGroupOpen,
} from "@renderer/features/todo/model/childExpanded";

import { toYearMonthKey } from "@renderer/utils/dateUtils";
import { scrollChildIntoView } from "@renderer/widgets/todo/scrollChildIntoView";
import { EmptyHint } from "./EmptyHint";
import {
  barBounds,
  barsFromSummaries,
  TimelineBar,
  TimelineRegion,
  updateTitlePositions,
} from "./timeline";
import MonthTimelineHeadCell from "./MonthTimelineHeadCell";
import MonthTimelineBar from "./MonthTimelineBar";

type TimelineGroup = {
  parent: TimelineBar;
  children: TimelineBar[];
};

const REGION_PAD_REM = 0.75;
const DAY_COL_REM = 4;

function regionFrame(start: number, end: number, dayCount: number) {
  const left = Math.max(0, (start - 1) * DAY_COL_REM - REGION_PAD_REM);
  const right = Math.min(dayCount * DAY_COL_REM, end * DAY_COL_REM + REGION_PAD_REM);
  return { left: `${left}rem`, width: `${right - left}rem` };
}

function groupBars(bars: TimelineBar[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  bars.forEach((bar) => {
    if (!bar.nested || groups.length === 0) {
      groups.push({ parent: bar, children: [] });
      return;
    }
    groups[groups.length - 1].children.push(bar);
  });
  return groups;
}

export default function MonthTimeline({
  year,
  month,
  onClickDay,
}: {
  year: number;
  month: number;
  onClickDay: (date: number) => void;
}) {
  const dayCount = new Date(year, month, 0).getDate();
  const trackWidth = `calc(${dayCount} * ${DAY_COL_WIDTH})`;
  const now = new Date();
  const thisDay = now.getDate();

  const scrollRef = useRef<HTMLDivElement>(null);
  const headRowRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const titleRefs = useRef(new Map<string, HTMLParagraphElement>());
  const regionRefs = useRef(new Map<string, HTMLDivElement>());

  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [ready, setReady] = useState(false);
  const [foldTick, setFoldTick] = useState(0);

  const bars = barsFromSummaries(summaries);
  const groups = groupBars(bars);
  const visibleBars = groups.flatMap((group) => {
    const open = foldTick >= 0 && isChildGroupOpen(group.parent.anchor);
    if (group.children.length === 0 || !open) return [group.parent];
    return [group.parent, ...group.children];
  });
  const regions: TimelineRegion[] = groups
    .filter((group) => group.children.length > 0)
    .map((group) => ({
      id: group.parent.id,
      bars: visibleBars.filter(
        (bar) =>
          bar.id === group.parent.id ||
          (bar.nested && bar.anchor === group.parent.anchor),
      ),
    }));

  /** 달 요약 데이터를 가져온다 */
  useEffect(() => {
    let cancelled = false;
    const yearMonth = toYearMonthKey(year, month);
    setReady(false);

    void window.api.getMonthSummary(yearMonth).then((result) => {
      if (cancelled) return;
      setSummaries(result.success ? (result.data ?? []) : []);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  /** 스크롤에 맞춰 할일 콘텐츠(내용) 위치와 표시 여부를 정한다 */
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const headRow = headRowRef.current;
    if (!root || !headRow) return;

    const update = () =>
      updateTitlePositions({
        root,
        headRow,
        dayCount,
        bars: visibleBars,
        titleRefs,
        regions,
        regionRefs,
      });
    update();
    root.addEventListener("scroll", update, {
      passive: true,
    });
    const observer = new ResizeObserver(update);
    observer.observe(root);

    return () => {
      root.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [visibleBars, regions, dayCount]);

  /** 처음 렌더링 시 오늘 날짜 위치로 스크롤한다 */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollChildIntoView(scrollRef.current, todayRef.current, "x");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [year, month, thisDay]);

  return (
    <div ref={scrollRef} className="scrollbar min-h-0 flex-1 overflow-auto">
      <div className="inline-block align-top" style={{ minWidth: trackWidth }}>
        <div
          ref={headRowRef}
          className="sticky top-0 z-20 border-b border-border bg-surface"
          style={{ width: trackWidth }}
        >
          <div className="flex">
            {Array.from({ length: dayCount }).map((_, index) => {
              const date = index + 1;
              return (
                <MonthTimelineHeadCell
                  key={date}
                  year={year}
                  month={month}
                  date={date}
                  todayRef={todayRef}
                  onClickDay={onClickDay}
                />
              );
            })}
          </div>
        </div>
        {ready && bars.length > 0 && (
          <div className="relative" style={{ width: trackWidth }}>
            <div
              className="pointer-events-none absolute inset-0 flex"
              aria-hidden
            >
              {Array.from({ length: dayCount }).map((_, index) => (
                <div
                  key={index}
                  style={{ width: DAY_COL_WIDTH }}
                  className="shrink-0 border-r border-border/50"
                />
              ))}
            </div>
            <div className="relative flex flex-col gap-2 pb-2">
              {groups.map((group) => {
                const hasChildren = group.children.length > 0;
                const open =
                  foldTick >= 0 && isChildGroupOpen(group.parent.anchor);
                const bounds = barBounds(group.parent);
                return (
                  <div
                    key={group.parent.id}
                    className={cn(
                      "relative flex flex-col gap-1",
                      hasChildren && "py-1",
                    )}
                  >
                    {hasChildren && bounds ? (
                      <div
                        aria-hidden
                        ref={(node) => {
                          if (node) regionRefs.current.set(group.parent.id, node);
                          else regionRefs.current.delete(group.parent.id);
                        }}
                        className="pointer-events-none absolute top-0 bottom-0 rounded-(--radius-card) bg-muted/50"
                        style={regionFrame(bounds.start, bounds.end, dayCount)}
                      />
                    ) : null}
                    <MonthTimelineBar
                      bar={group.parent}
                      trackWidth={trackWidth}
                      titleRefs={titleRefs}
                      fold={
                        hasChildren
                          ? {
                              open,
                              onToggle: () => {
                                setChildGroupOpen(group.parent.anchor, !open);
                                setFoldTick((n) => n + 1);
                              },
                            }
                          : undefined
                      }
                    />
                    {hasChildren && open ? (
                      <div className="relative flex flex-col gap-1">
                        {bounds ? (
                          <div
                            aria-hidden
                            className="pointer-events-none absolute z-10 top-0 bottom-0 border-l border-border"
                            style={{
                              left: `calc(${bounds.start - 1} * ${DAY_COL_WIDTH} + 0.3rem)`,
                            }}
                          />
                        ) : null}
                        {group.children.map((child) => (
                          <MonthTimelineBar
                            key={child.id}
                            bar={child}
                            trackWidth={trackWidth}
                            titleRefs={titleRefs}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {ready && bars.length === 0 && (
        <div className="flex relative justify-center w-full">
          <div className="fixed">
            <EmptyHint>이 달에 등록된 할 일이 없습니다.</EmptyHint>
          </div>
        </div>
      )}
    </div>
  );
}
