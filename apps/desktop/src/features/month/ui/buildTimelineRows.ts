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
  /** 막대가 처음 보이는 날의 순서. 하위를 부모 아래에서 나열할 때 쓴다. */
  leadSortOrder: number;
  /** 부모 묶음 키. 하위는 이 값으로 부모 막대 아래에 붙는다. */
  anchor: string;
  nested: boolean;
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
  anchor: string;
  items: GroupItem[];
};

function toRow(summaries: DaySummary[], group: GroupAcc): TimelineRow {
  const startIndex = Math.min(...group.items.map((item) => item.dayIndex));
  const endIndex = Math.max(...group.items.map((item) => item.dayIndex));
  const byIndex = new Map(group.items.map((item) => [item.dayIndex, item]));
  const lastItem = byIndex.get(endIndex);
  const leadItem = byIndex.get(startIndex);

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
    leadSortOrder: leadItem?.todo.sort_order ?? 0,
    anchor: group.anchor,
    nested: false,
    startIndex,
    cells,
    isSettled,
  };
}

function rowsFor(
  summaries: DaySummary[],
  child: boolean,
): TimelineRow[] {
  const batches = new Map<string, GroupAcc>();
  const solos: GroupAcc[] = [];

  summaries.forEach((day, dayIndex) => {
    day.todos.forEach((todo) => {
      if (Boolean(todo.parent_id) !== child) return;
      const item: GroupItem = { date: day.date, dayIndex, todo };
      const anchor = todo.parent_id ?? todo.group_key;
      if (!todo.batch_id) {
        solos.push({
          key: `solo-${day.date}-${todo.id}`,
          content: todo.content,
          anchor,
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
        anchor,
        items: [item],
      });
    });
  });

  return [
    ...[...batches.values()].map((group) => toRow(summaries, group)),
    ...solos.map((group) => toRow(summaries, group)),
  ];
}

function byLastDate(a: TimelineRow, b: TimelineRow) {
  if (a.lastDate !== b.lastDate) {
    return a.lastDate < b.lastDate ? 1 : -1;
  }
  return a.sortOrder - b.sortOrder;
}

/** 부모 막대를 끝나는 날이 늦은 순으로 두고, 그 바로 아래에 하위를 붙인다. */
export function buildTimelineRows(summaries: DaySummary[]): TimelineRow[] {
  const parents = rowsFor(summaries, false).sort(byLastDate);
  const children = rowsFor(summaries, true);
  const byParent = new Map<string, TimelineRow[]>();

  children.forEach((row) => {
    const list = byParent.get(row.anchor) ?? [];
    list.push(row);
    byParent.set(row.anchor, list);
  });
  byParent.forEach((list) => {
    list.sort((a, b) => a.leadSortOrder - b.leadSortOrder);
  });

  const rows: TimelineRow[] = [];
  parents.forEach((parent) => {
    rows.push(parent);
    const nested = byParent.get(parent.anchor) ?? [];
    nested.forEach((child) => rows.push({ ...child, nested: true }));
  });
  return rows;
}
