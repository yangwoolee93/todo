import type { TimelineTodo } from "../../stores/useTimelineStore";
import { nextDate, type DayColumn } from "./days";

export type TimelineSegment = {
  start: number;
  todos: TimelineTodo[];
};

export type TimelineBar = {
  seriesId: string;
  title: string;
  firstDate: string;
  lastDate: string;
  sortOrder: number;
  parentSeriesId: string;
  settled: boolean;
  segments: TimelineSegment[];
};

export function barBounds(bar: TimelineBar) {
  const first = bar.segments[0];
  if (!first) return null;
  let start = first.start;
  let end = first.start + first.todos.length - 1;
  for (const segment of bar.segments) {
    start = Math.min(start, segment.start);
    end = Math.max(end, segment.start + segment.todos.length - 1);
  }
  return { start, end };
}

/** 같은 묶음의 연속된 날을 한 막대로 잇는다. 줄 순서는 묶음이 처음 시작한 날이다. */
export function buildBars(todos: TimelineTodo[], days: DayColumn[]): TimelineBar[] {
  const indexByDate = new Map(days.map((day, index) => [day.date, index]));
  const groups = new Map<string, TimelineTodo[]>();
  for (const todo of todos) {
    const list = groups.get(todo.seriesId) ?? [];
    list.push(todo);
    groups.set(todo.seriesId, list);
  }

  const bars: TimelineBar[] = [];
  for (const [seriesId, items] of groups) {
    const sorted = [...items].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    const first = sorted[0];
    if (!first) continue;
    const segments: TimelineSegment[] = [];
    let current: TimelineSegment | null = null;
    for (const todo of sorted) {
      const index = indexByDate.get(todo.date);
      if (index === undefined) continue;
      const previous = current?.todos[current.todos.length - 1];
      if (current && previous && nextDate(previous.date) === todo.date) {
        current.todos.push(todo);
        continue;
      }
      current = { start: index, todos: [todo] };
      segments.push(current);
    }
    if (segments.length === 0) continue;
    const last = sorted[sorted.length - 1] ?? first;
    bars.push({
      seriesId,
      title: first.title,
      firstDate: first.date,
      lastDate: last.date,
      sortOrder: first.sortOrder,
      parentSeriesId:
        first.parentSeriesId && first.parentSeriesId !== seriesId ? first.parentSeriesId : "",
      settled:
        sorted.length > 0 &&
        sorted.every((todo) => todo.status === "success" || todo.status === "failed"),
      segments,
    });
  }

  bars.sort((a, b) => {
    if (a.firstDate !== b.firstDate) return a.firstDate < b.firstDate ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.seriesId < b.seriesId ? -1 : 1;
  });
  return bars;
}
