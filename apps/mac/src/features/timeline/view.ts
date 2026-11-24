import type { TimelineTodo } from "../../stores/useTimelineStore";
import { buildBars, type TimelineBar } from "./bars";
import type { DayColumn } from "./days";

const KEY = "arc-timeline-view";

export type SortKey = "start" | "end";
export type SortDir = "asc" | "desc";
export type SortRule = { id: string; key: SortKey; dir: SortDir };
export type FilterJoin = "and" | "or";
export type FilterRule = { id: string; statuses: string[] };

export type TimelineView = {
  sorts: SortRule[];
  join: FilterJoin;
  filters: FilterRule[];
};

export type SavedTimelineView = TimelineView & { pageId: string };

type Sortable = {
  firstDate: string;
  lastDate: string;
  sortOrder: number;
  seriesId: string;
};

export function emptyTimelineView(): TimelineView {
  return { sorts: [], join: "or", filters: [] };
}

export function parseTimelineViews(value: unknown): SavedTimelineView[] {
  if (!Array.isArray(value)) return [];
  const views: SavedTimelineView[] = [];
  const pages = new Set<string>();
  for (const item of value) {
    const view = parseSavedView(item);
    if (!view || pages.has(view.pageId)) continue;
    if (view.sorts.length === 0 && view.filters.length === 0) continue;
    pages.add(view.pageId);
    views.push(view);
  }
  return views;
}

export function readLocalTimelineViews(): SavedTimelineView[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return parseTimelineViews(
      Object.entries(parsed).map(([pageId, view]) =>
        view && typeof view === "object" ? { ...(view as object), pageId } : null,
      ),
    );
  } catch {
    return [];
  }
}

export function writeLocalTimelineViews(views: SavedTimelineView[]) {
  const all: Record<string, TimelineView> = {};
  for (const view of views) {
    all[view.pageId] = {
      sorts: view.sorts,
      join: view.join,
      filters: view.filters,
    };
  }
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearLocalTimelineViews() {
  localStorage.removeItem(KEY);
}

function parseSavedView(value: unknown): SavedTimelineView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const pageId = typeof raw.pageId === "string" ? raw.pageId.trim() : "";
  if (!pageId) return null;
  const sorts: SortRule[] = [];
  const seen = new Set<SortKey>();
  if (Array.isArray(raw.sorts)) {
    for (const rule of raw.sorts) {
      if (!rule || typeof rule !== "object") continue;
      const item = rule as Record<string, unknown>;
      const key = item.key === "end" ? "end" : item.key === "start" ? "start" : null;
      const dir = item.dir === "desc" ? "desc" : item.dir === "asc" ? "asc" : null;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!key || !dir || !id || seen.has(key)) continue;
      seen.add(key);
      sorts.push({ id, key, dir });
    }
  }
  const filters: FilterRule[] = [];
  const filterIds = new Set<string>();
  if (Array.isArray(raw.filters)) {
    for (const rule of raw.filters) {
      if (!rule || typeof rule !== "object") continue;
      const item = rule as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!id || filterIds.has(id) || !Array.isArray(item.statuses)) continue;
      const statuses = [
        ...new Set(
          item.statuses.filter((status) => typeof status === "string" && status.trim()),
        ),
      ] as string[];
      if (statuses.length === 0) continue;
      filterIds.add(id);
      filters.push({ id, statuses });
    }
  }
  return {
    pageId,
    sorts,
    join: raw.join === "and" ? "and" : "or",
    filters,
  };
}

export function compareBars(a: Sortable, b: Sortable, sorts: SortRule[]) {
  const rules = sorts.length > 0 ? sorts : [{ key: "start" as const, dir: "asc" as const }];
  for (const rule of rules) {
    const left = rule.key === "start" ? a.firstDate : a.lastDate;
    const right = rule.key === "start" ? b.firstDate : b.lastDate;
    if (left === right) continue;
    const order = left < right ? -1 : 1;
    return rule.dir === "asc" ? order : -order;
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.seriesId === b.seriesId) return 0;
  return a.seriesId < b.seriesId ? -1 : 1;
}

/** 등록된 정렬과 상태 필터를 막대에 적용한다. 날짜 정렬은 항목 전체 기간을 기준으로 한다. */
export function presentBars(
  todos: TimelineTodo[],
  days: DayColumn[],
  view: TimelineView,
  catalogIds: ReadonlySet<string>,
): TimelineBar[] {
  const full = buildBars(todos, days);
  const rules = view.filters
    .map((rule) => ({
      ...rule,
      statuses: rule.statuses.filter((status) => catalogIds.has(status)),
    }))
    .filter((rule) => rule.statuses.length > 0);
  const source = new Map(full.map((bar) => [bar.seriesId, bar]));
  let bars = full;
  if (rules.length > 0) {
    const owned = new Map<string, Set<string>>();
    for (const todo of todos) {
      const set = owned.get(todo.seriesId) ?? new Set<string>();
      set.add(todo.status);
      owned.set(todo.seriesId, set);
    }
    const visible = new Set(
      full
        .filter((bar) => matchesSeries(owned.get(bar.seriesId) ?? new Set(), rules, view.join))
        .map((bar) => bar.seriesId),
    );
    const shown = new Set(rules.flatMap((rule) => rule.statuses));
    bars = buildBars(
      todos.filter((todo) => visible.has(todo.seriesId) && shown.has(todo.status)),
      days,
    );
    for (const bar of bars) {
      const origin = source.get(bar.seriesId);
      if (!origin) continue;
      bar.firstDate = origin.firstDate;
      bar.lastDate = origin.lastDate;
      bar.sortOrder = origin.sortOrder;
      bar.settled = origin.settled;
    }
  }
  bars.sort((a, b) => compareBars(a, b, view.sorts));
  return bars;
}

function matchesSeries(statuses: Set<string>, rules: FilterRule[], join: FilterJoin) {
  const hit = (rule: FilterRule) => rule.statuses.some((status) => statuses.has(status));
  return join === "and" ? rules.every(hit) : rules.some(hit);
}

