import type { DaySummary, TodoStatus } from "@shared/types/todo";
import { WEEKDAYS } from "./constants";

export type AgendaItem = {
  id: string;
  title: string;
  status: TodoStatus;
};

export type AgendaBlock = {
  item: AgendaItem;
  /** 접기는 일별 목록, 타임라인과 이 값으로 같이 기억한다. */
  anchor: string;
  children: AgendaItem[];
};

export type AgendaGroup = {
  day: number;
  blocks: AgendaBlock[];
};

function agendaBlocks(todos: DaySummary["todos"]): AgendaBlock[] {
  const roots = todos
    .filter((todo) => !todo.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at);
  return roots.map((root) => ({
    item: { id: root.id, title: root.content, status: root.status },
    anchor: root.group_key,
    children: todos
      .filter((todo) => todo.parent_id === root.group_key)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
      .map((child) => ({
        id: child.id,
        title: child.content,
        status: child.status,
      })),
  }));
}

/** 할 일이 있는 날만 묶는다. includeDay가 있으면 그날은 비어도 남긴다 */
export function agendaGroupsFromSummaries(
  summaries: DaySummary[],
  includeDay?: number,
): AgendaGroup[] {
  return summaries
    .filter((item) => item.todos.length > 0 || item.day === includeDay)
    .map((item) => ({
      day: item.day,
      blocks: agendaBlocks(item.todos),
    }));
}

export function weekdayLabel(year: number, month: number, day: number) {
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]}요일`;
}
