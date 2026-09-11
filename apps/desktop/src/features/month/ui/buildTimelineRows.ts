import type { DaySummary, DisplayTodo } from "@shared/types/todo";

export type TimelineRowCell = {
  date: string;
  todo: DisplayTodo | null;
};

export type TimelineRow = {
  key: string;
  content: string;
  lastDate: string;
  sortOrder: number;
  startIndex: number;
  cells: TimelineRowCell[];
  isSettled: boolean;
};

type GroupItem = {
  date: string;
  dayIndex: number;
  todo: DisplayTodo;
};

type GroupAcc = {
  key: string;
  content: string;
  items: GroupItem[];
};

function toRow(summaries: DaySummary[], group: GroupAcc): TimelineRow {
  const startIndex = Math.min(...group.items.map((item) => item.dayIndex));
  const endIndex = Math.max(...group.items.map((item) => item.dayIndex));
  const byIndex = new Map(group.items.map((item) => [item.dayIndex, item]));
  const lastItem = byIndex.get(endIndex);

  const cells: TimelineRowCell[] = [];
  for (let dayIndex = startIndex; dayIndex <= endIndex; dayIndex += 1) {
    cells.push({
      date: summaries[dayIndex].date,
      todo: byIndex.get(dayIndex)?.todo ?? null,
    });
  }

  const filled = group.items.map((item) => item.todo);
  const isSettled =
    filled.length > 0 &&
    filled.every((todo) => todo.status === "completed" || todo.status === "failed");

  return {
    key: group.key,
    content: group.content,
    lastDate: summaries[endIndex].date,
    sortOrder: lastItem?.todo.sort_order ?? 0,
    startIndex,
    cells,
    isSettled,
  };
}

/** 날짜별 할 일을 batch_id 한 행으로 묶고, 마지막 날짜가 늦은 행이 위로 오게 한다. */
export function buildTimelineRows(summaries: DaySummary[]): TimelineRow[] {
  const batches = new Map<string, GroupAcc>();
  const solos: GroupAcc[] = [];

  summaries.forEach((day, dayIndex) => {
    day.todos.forEach((todo) => {
      const item: GroupItem = { date: day.date, dayIndex, todo };
      if (!todo.batch_id) {
        solos.push({
          key: `solo-${day.date}-${todo.id}`,
          content: todo.content,
          items: [item],
        });
        return;
      }

      const existing = batches.get(todo.batch_id);
      if (existing) {
        existing.items.push(item);
        return;
      }

      batches.set(todo.batch_id, {
        key: `batch-${todo.batch_id}`,
        content: todo.content,
        items: [item],
      });
    });
  });

  const rows = [
    ...[...batches.values()].map((group) => toRow(summaries, group)),
    ...solos.map((group) => toRow(summaries, group)),
  ];

  rows.sort((a, b) => {
    if (a.lastDate !== b.lastDate) {
      return a.lastDate < b.lastDate ? 1 : -1;
    }
    return a.sortOrder - b.sortOrder;
  });

  return rows;
}
