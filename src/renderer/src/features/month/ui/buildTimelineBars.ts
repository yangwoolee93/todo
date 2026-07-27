import type { DaySummary, DisplayTodo, TodoStatus } from "@shared/types/todo";

export type TimelineBar = {
  key: string;
  content: string;
  status: TodoStatus;
  startDate: string;
  endDate: string;
  startIndex: number;
  endIndex: number;
  sortOrder: number;
  createdAt: number;
};

function compareBars(a: TimelineBar, b: TimelineBar): number {
  if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.createdAt - b.createdAt;
}

/**
 * 월 summaries → 타임라인 막대 (batch는 한 행으로 병합)
 */
export function buildTimelineBars(summaries: DaySummary[]): TimelineBar[] {
  if (summaries.length === 0) return [];

  const dateToIndex = new Map(summaries.map((d, i) => [d.date, i]));

  type BatchAcc = {
    content: string;
    status: TodoStatus;
    dates: string[];
    sortOrder: number;
    createdAt: number;
  };

  const batches = new Map<string, BatchAcc>();
  const singles: TimelineBar[] = [];

  for (const day of summaries) {
    const dayIndex = dateToIndex.get(day.date);
    if (dayIndex === undefined) continue;

    for (const todo of day.todos) {
      if (todo.batch_id) {
        const prev = batches.get(todo.batch_id);
        if (!prev) {
          batches.set(todo.batch_id, {
            content: todo.content,
            status: todo.status,
            dates: [day.date],
            sortOrder: todo.sort_order,
            createdAt: todo.created_at,
          });
        } else {
          prev.dates.push(day.date);
          if (todo.sort_order < prev.sortOrder) prev.sortOrder = todo.sort_order;
          if (todo.created_at < prev.createdAt) prev.createdAt = todo.created_at;
        }
        continue;
      }

      singles.push({
        key: `todo-${todo.id}`,
        content: todo.content,
        status: todo.status,
        startDate: day.date,
        endDate: day.date,
        startIndex: dayIndex,
        endIndex: dayIndex,
        sortOrder: todo.sort_order,
        createdAt: todo.created_at,
      });
    }
  }

  const batchBars: TimelineBar[] = [];
  for (const [batchId, acc] of batches) {
    const sortedDates = [...acc.dates].sort();
    const startDate = sortedDates[0]!;
    const endDate = sortedDates[sortedDates.length - 1]!;
    const startIndex = dateToIndex.get(startDate);
    const endIndex = dateToIndex.get(endDate);
    if (startIndex === undefined || endIndex === undefined) continue;

    batchBars.push({
      key: `batch-${batchId}`,
      content: acc.content,
      status: acc.status,
      startDate,
      endDate,
      startIndex,
      endIndex,
      sortOrder: acc.sortOrder,
      createdAt: acc.createdAt,
    });
  }

  const bars = [...singles, ...batchBars];
  bars.sort(compareBars);
  return bars;
}

/** 막대 left/width (px) — docs/month-timeline.md */
export function barGeometry(
  startIndex: number,
  endIndex: number,
  dayWidth: number,
): { left: number; width: number } {
  const span = endIndex - startIndex + 1;
  const inset = 1;
  return {
    left: startIndex * dayWidth + inset,
    width: span * dayWidth - inset * 2,
  };
}

export function indexForDate(summaries: DaySummary[], date: string): number {
  return summaries.findIndex((d) => d.date === date);
}
