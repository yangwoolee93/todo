import type { DaySummary, TodoStatus } from "@shared/types/todo";
import { WEEKDAYS } from "./constants";

export type AgendaItem = {
  id: number;
  title: string;
  status: TodoStatus;
};

export type AgendaGroup = {
  day: number;
  items: AgendaItem[];
};

/** 할 일이 있는 날만 묶는다. includeDay가 있으면 그날은 비어도 남긴다 */
export function agendaGroupsFromSummaries(
  summaries: DaySummary[],
  includeDay?: number,
): AgendaGroup[] {
  return summaries
    .filter((item) => item.todos.length > 0 || item.day === includeDay)
    .map((item) => ({
      day: item.day,
      items: item.todos.map((todo) => ({
        id: todo.id,
        title: todo.content,
        status: todo.status,
      })),
    }));
}

export function weekdayLabel(year: number, month: number, day: number) {
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]}요일`;
}
