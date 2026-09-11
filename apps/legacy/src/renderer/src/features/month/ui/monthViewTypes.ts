import type { DaySummary } from "@shared/types/todo";

export type MonthDayViewProps = {
  summaries: DaySummary[];
  today: string;
  selectedDate: string | null;
  onDateClick: (date: string) => void;
  onGoToDate: (date: string) => void;
  /** 증가할 때마다 오늘(금일) 위치로 스크롤 */
  scrollToTodayTick: number;
};
