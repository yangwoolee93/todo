import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAY_COL_WIDTH } from "./constants";
import { DaySummary } from "@shared/types/todo";

import { EmptyHint } from "./tempMonthTimeline";
import {
  barsFromSummaries,
  scrollChildIntoView,
  toYearMonthKey,
  updateTitlePositions,
} from "./monthTimelineTempUtil";
import MonthTimelineHeadCell from "./MonthTimelineHeadCell";
import MonthTimelineBar from "./MonthTimelineBar";

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

  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [ready, setReady] = useState(false);

  const bars = barsFromSummaries(summaries);

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

    const update = () => updateTitlePositions({ root, headRow, dayCount, bars, titleRefs });
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
  }, [bars, dayCount]);

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
              {bars.map((bar) => (
                <MonthTimelineBar
                  key={bar.id}
                  bar={bar}
                  trackWidth={trackWidth}
                  titleRefs={titleRefs}
                />
              ))}
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
