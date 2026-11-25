import type { TimelineTodo } from "../../stores/useTimelineStore";
import { buildBars, type TimelineBar } from "./bars";
import type { DayColumn } from "./days";

const KEY = "arc-timeline-view";

export type SortKey = "start" | "end" | "title";
export type SortDir = "asc" | "desc";
export type SortRule = { id: string; key: SortKey; dir: SortDir };
export type FilterJoin = "and" | "or";
export type FilterProperty = "status" | "tag" | "title";
export type FilterOp = "is" | "isNot" | "contains" | "notContains";
export type FilterRule = {
  id: string;
  property: FilterProperty;
  op: FilterOp;
  values: string[];
};

export type TimelineView = {
  id: string;
  /** 비어 있으면 케이던스 페이지 제목을 보여 준다. */
  name: string;
  sorts: SortRule[];
  join: FilterJoin;
  filters: FilterRule[];
  /** 막대에 그릴 상태. 비어 있으면 남은 항목의 모든 날을 그린다. */
  bars: string[];
};

export type SavedTimelineView = TimelineView & { pageId: string; active: boolean };

type Sortable = {
  title: string;
  firstDate: string;
  lastDate: string;
  sortOrder: number;
  seriesId: string;
};

type SeriesFact = {
  title: string;
  tags: string[];
  statuses: Set<string>;
};

export function emptyTimelineView(id = ""): TimelineView {
  return { id, name: "", sorts: [], join: "or", filters: [], bars: [] };
}

function viewCarries(view: { name: string; sorts: readonly unknown[]; filters: readonly unknown[]; bars: readonly unknown[] }) {
  return view.name.trim() !== "" || view.sorts.length > 0 || view.filters.length > 0 || view.bars.length > 0;
}

export function viewsForPage(saved: readonly SavedTimelineView[], pageId: string): TimelineView[] {
  const own = saved.filter((view) => view.pageId === pageId);
  if (own.length === 0) return [emptyTimelineView(pageId)];
  return own.map((view) => ({
    id: view.id,
    name: view.name,
    sorts: view.sorts,
    join: view.join,
    filters: view.filters,
    bars: view.bars,
  }));
}

export function activeViewId(saved: readonly SavedTimelineView[], pageId: string) {
  const own = saved.filter((view) => view.pageId === pageId);
  const active = own.find((view) => view.active);
  return active?.id || own[0]?.id || pageId;
}

export function replacePageViews(
  saved: readonly SavedTimelineView[],
  pageId: string,
  update: (views: TimelineView[]) => TimelineView[],
  activeId: string,
): SavedTimelineView[] {
  const next = update(viewsForPage(saved, pageId));
  const list = next.length > 0 ? next : [emptyTimelineView(pageId)];
  const others = saved.filter((view) => view.pageId !== pageId);
  if (list.length === 1 && !viewCarries(list[0])) return [...others];
  const chosen = list.some((view) => view.id === activeId) ? activeId : list[0].id;
  return [
    ...others,
    ...list.map((view) => ({
      ...view,
      name: view.name.trim(),
      pageId,
      active: view.id === chosen,
    })),
  ];
}

export function viewNarrows(view: TimelineView) {
  return view.bars.length > 0 || view.filters.some((rule) => rule.values.some((value) => value.trim()));
}

export function parseTimelineViews(value: unknown): SavedTimelineView[] {
  if (!Array.isArray(value)) return [];
  const views: SavedTimelineView[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const view = parseSavedView(item);
    if (!view || seen.has(`${view.pageId}\0${view.id}`)) continue;
    seen.add(`${view.pageId}\0${view.id}`);
    views.push(view);
  }
  const blankPages = new Set<string>();
  const pages = new Set(views.map((view) => view.pageId));
  for (const pageId of pages) {
    const own = views.filter((view) => view.pageId === pageId);
    if (own.every((view) => !viewCarries(view))) blankPages.add(pageId);
  }
  return views.filter((view) => !blankPages.has(view.pageId));
}

export function readLocalTimelineViews(): SavedTimelineView[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parseTimelineViews(parsed);
    if (!parsed || typeof parsed !== "object") return [];
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
  localStorage.setItem(KEY, JSON.stringify(views));
}

export function clearLocalTimelineViews() {
  localStorage.removeItem(KEY);
}

function parseSavedView(value: unknown): SavedTimelineView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const pageId = typeof raw.pageId === "string" ? raw.pageId.trim() : "";
  if (!pageId) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : pageId;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const sorts: SortRule[] = [];
  const seen = new Set<SortKey>();
  if (Array.isArray(raw.sorts)) {
    for (const rule of raw.sorts) {
      if (!rule || typeof rule !== "object") continue;
      const item = rule as Record<string, unknown>;
      const key =
        item.key === "end" || item.key === "start" || item.key === "title" ? item.key : null;
      const dir = item.dir === "desc" ? "desc" : item.dir === "asc" ? "asc" : null;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      if (!key || !dir || !id || seen.has(key)) continue;
      seen.add(key);
      sorts.push({ id, key, dir });
    }
  }
  const filters: FilterRule[] = [];
  const filterIds = new Set<string>();
  let legacyClip = false;
  if (Array.isArray(raw.filters)) {
    for (const rule of raw.filters) {
      if (!rule || typeof rule !== "object") continue;
      const item = rule as Record<string, unknown>;
      const parsed = parseFilter(item);
      if (!parsed || filterIds.has(parsed.id)) continue;
      if (!("property" in item)) legacyClip = true;
      filterIds.add(parsed.id);
      filters.push(parsed);
    }
  }
  const bars = Array.isArray(raw.bars)
    ? textList(raw.bars)
    : legacyClip
      ? textList(
          filters
            .filter((rule) => rule.property === "status" && rule.op === "is")
            .flatMap((rule) => rule.values),
        )
      : [];
  return {
    pageId,
    id,
    name,
    active: raw.active === true,
    sorts,
    join: raw.join === "and" ? "and" : "or",
    filters,
    bars,
  };
}

function parseFilter(item: Record<string, unknown>): FilterRule | null {
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;
  if (item.property === "status" || item.property === "tag" || item.property === "title") {
    const allowed = item.property === "status" ? ["is", "isNot"] : ["contains", "notContains"];
    if (typeof item.op !== "string" || !allowed.includes(item.op)) return null;
    return {
      id,
      property: item.property,
      op: item.op as FilterOp,
      values: textList(item.values),
    };
  }
  if (!Array.isArray(item.statuses)) return null;
  const values = textList(item.statuses);
  if (values.length === 0) return null;
  return { id, property: "status", op: "is", values };
}

function textList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    list.push(text);
  }
  return list;
}

export function compareBars(a: Sortable, b: Sortable, sorts: SortRule[]) {
  const rules = sorts.length > 0 ? sorts : [{ key: "start" as const, dir: "asc" as const }];
  for (const rule of rules) {
    if (rule.key === "title") {
      const order = a.title.localeCompare(b.title, "ko");
      if (order === 0) continue;
      return rule.dir === "asc" ? order : -order;
    }
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

/** 정렬, 항목 필터, 막대에 그릴 상태를 적용한다. 날짜 정렬은 항목 전체 기간을 기준으로 한다. */
export function presentBars(
  todos: TimelineTodo[],
  days: DayColumn[],
  view: TimelineView,
  catalogIds: ReadonlySet<string>,
): TimelineBar[] {
  const full = buildBars(todos, days);
  const facts = seriesFacts(todos);
  const rules = activeRules(view.filters, catalogIds);
  const visible = new Set(
    full
      .filter((bar) => seriesMatches(facts.get(bar.seriesId), rules, view.join))
      .map((bar) => bar.seriesId),
  );
  const paint = view.bars.filter((status) => catalogIds.has(status));
  const source = new Map(full.map((bar) => [bar.seriesId, bar]));
  const bars = buildBars(
    todos.filter(
      (todo) => visible.has(todo.seriesId) && (paint.length === 0 || paint.includes(todo.status)),
    ),
    days,
  );
  for (const bar of bars) {
    const origin = source.get(bar.seriesId);
    if (!origin) continue;
    bar.title = origin.title;
    bar.firstDate = origin.firstDate;
    bar.lastDate = origin.lastDate;
    bar.sortOrder = origin.sortOrder;
    bar.settled = origin.settled;
  }
  bars.sort((a, b) => compareBars(a, b, view.sorts));
  return bars;
}

function seriesFacts(todos: TimelineTodo[]) {
  const facts = new Map<string, SeriesFact>();
  const ordered = [...todos].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const todo of ordered) {
    const current = facts.get(todo.seriesId);
    if (!current) {
      facts.set(todo.seriesId, {
        title: todo.title,
        tags: [...todo.tags],
        statuses: new Set([todo.status]),
      });
      continue;
    }
    current.statuses.add(todo.status);
  }
  return facts;
}

function activeRules(filters: FilterRule[], catalogIds: ReadonlySet<string>) {
  const rules: FilterRule[] = [];
  for (const rule of filters) {
    if (rule.property === "status") {
      const values = rule.values.filter((status) => catalogIds.has(status));
      if (values.length === 0) continue;
      rules.push({ ...rule, values });
      continue;
    }
    const values = textList(rule.values);
    if (rule.property === "title") {
      const query = values[0];
      if (!query) continue;
      rules.push({ ...rule, values: [query] });
      continue;
    }
    if (values.length === 0) continue;
    rules.push({ ...rule, values });
  }
  return rules;
}

function seriesMatches(fact: SeriesFact | undefined, rules: FilterRule[], join: FilterJoin) {
  if (rules.length === 0) return true;
  if (!fact) return false;
  const hits = rules.map((rule) => ruleMatches(fact, rule));
  return join === "and" ? hits.every(Boolean) : hits.some(Boolean);
}

function ruleMatches(fact: SeriesFact, rule: FilterRule) {
  if (rule.property === "status") {
    const hit = rule.values.some((status) => fact.statuses.has(status));
    return rule.op === "is" ? hit : !hit;
  }
  if (rule.property === "tag") {
    const hit = rule.values.some((tag) => fact.tags.includes(tag));
    return rule.op === "contains" ? hit : !hit;
  }
  const query = (rule.values[0] ?? "").toLocaleLowerCase("ko");
  const hit = fact.title.toLocaleLowerCase("ko").includes(query);
  return rule.op === "contains" ? hit : !hit;
}
