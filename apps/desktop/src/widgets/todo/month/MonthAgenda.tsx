import { DaySummary } from "@shared/types/todo";
import { useEffect, useRef, useState } from "react";
import { EmptyHint } from "./tempMonthTimeline";
import { agendaGroupsFromSummaries } from "./monthAgendaTempUtil";
import { scrollChildIntoView, toYearMonthKey } from "./monthTimelineTempUtil";
import MonthAgendaDayGroup from "./MonthAgendaDayGroup";

export default function MonthAgenda({
  year,
  month,
  onClickDay,
}: {
  year: number;
  month: number;
  onClickDay: (date: number) => void;
}) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const thisDay = now.getDate();
  const isCurrentMonth = year === thisYear && month === thisMonth;

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLElement>(null);

  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [ready, setReady] = useState(false);

  const groups = agendaGroupsFromSummaries(summaries, isCurrentMonth ? thisDay : undefined);

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

  /**
   * 처음 렌더링 시 오늘 위치로 세로 스크롤한다.
   * 오늘로를 같은 달에서 다시 눌러도 스크롤하려면 페이지에 tick 상태가 필요하다.
   */
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollChildIntoView(scrollRef.current, todayRef.current, "y", "smooth");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [year, month, thisDay, ready]);

  return (
    <div ref={scrollRef} className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      {!ready ? null : groups.length === 0 ? (
        <EmptyHint>이 달에 등록된 할 일이 없습니다.</EmptyHint>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <MonthAgendaDayGroup
              key={group.day}
              year={year}
              month={month}
              group={group}
              todayRef={todayRef}
              onClickDay={onClickDay}
            />
          ))}
        </div>
      )}
    </div>
  );
}
