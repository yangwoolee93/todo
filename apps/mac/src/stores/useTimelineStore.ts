import { create } from "zustand";
import { datesFrom, parseIso } from "../features/timeline/days";
import {
  loadTimelineViews,
  loadTodoStatuses,
  loadTodos,
  saveTodos,
} from "../features/timeline/todoFile";
import {
  clearLocalTimelineViews,
  readLocalTimelineViews,
  type SavedTimelineView,
  type TimelineView,
} from "../features/timeline/view";
import { useSidebarStore } from "./useSidebarStore";

export type TimelineTodo = {
  id: string;
  pageId: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
  status: string;
  seriesId: string;
  parentSeriesId: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  trashedWith: string;
};

export type TodoStatusDef = {
  id: string;
  pageId: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type SeriesDraft = {
  title: string;
  body: string;
  tags: string[];
};

const STATUS_PRESETS = [
  { id: "pending", name: "대기", color: "#a8a29e" },
  { id: "success", name: "성공", color: "#16885a" },
  { id: "failed", name: "실패", color: "#ea580c" },
] as const;

const EXTRA_COLORS = ["#2563eb", "#7c3aed", "#e11d48", "#d97706", "#45ada5", "#78716c"];

export const statusPalette = [
  ...STATUS_PRESETS.map((item) => item.color),
  ...EXTRA_COLORS,
];

export function isBuiltinStatus(id: string) {
  return STATUS_PRESETS.some((item) => item.id === id);
}

export function defaultStatuses(pageId: string): TodoStatusDef[] {
  return STATUS_PRESETS.map((item, sortOrder) => ({ ...item, pageId, sortOrder }));
}

export function statusesFor(statuses: TodoStatusDef[], pageId: string) {
  const saved = statuses
    .filter((status) => status.pageId === pageId)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));
  if (saved.length === 0) return defaultStatuses(pageId);
  const missing = defaultStatuses(pageId).filter(
    (item) => !saved.some((status) => status.id === item.id),
  );
  return [...saved, ...missing].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function nextStatusColor(count: number) {
  return EXTRA_COLORS[Math.max(0, count - STATUS_PRESETS.length) % EXTRA_COLORS.length] ?? EXTRA_COLORS[0];
}

function replacePageStatuses(
  statuses: TodoStatusDef[],
  pageId: string,
  next: TodoStatusDef[],
) {
  return [...statuses.filter((status) => status.pageId !== pageId), ...next];
}

type TimelineState = {
  todos: TimelineTodo[];
  statuses: TodoStatusDef[];
  views: SavedTimelineView[];
  addTodo: (pageId: string, date: string, title: string) => string;
  addSeries: (pageId: string, dates: string[], draft: SeriesDraft) => string;
  addChildSeries: (
    pageId: string,
    parentSeriesId: string,
    dates: string[],
    draft: SeriesDraft,
  ) => string;
  updateTitle: (id: string, title: string) => void;
  renameSeries: (seriesId: string, title: string) => void;
  setSeriesBody: (seriesId: string, body: string) => void;
  setSeriesTags: (seriesId: string, tags: string[]) => void;
  setSeriesSpan: (seriesId: string, start: string, end: string) => void;
  setStatus: (id: string, status: string) => void;
  renameStatus: (pageId: string, id: string, name: string) => void;
  recolorStatus: (pageId: string, id: string, color: string) => void;
  addStatus: (pageId: string, name: string, color: string) => string;
  removeStatus: (pageId: string, id: string) => void;
  removeTodo: (id: string) => void;
  removeSeries: (seriesId: string) => void;
  restoreSeries: (seriesId: string) => void;
  restorePages: (pageIds: string[]) => void;
  purgeSeries: (seriesId: string) => void;
  removePages: (pageIds: string[]) => void;
  setTimelineView: (pageId: string, view: TimelineView) => void;
  hydrate: () => Promise<void>;
};

function seriesFamily(todos: TimelineTodo[], rootId: string) {
  const children = new Map<string, string[]>();
  for (const todo of todos) {
    if (!todo.parentSeriesId) continue;
    const list = children.get(todo.parentSeriesId);
    if (list) {
      if (!list.includes(todo.seriesId)) list.push(todo.seriesId);
    } else {
      children.set(todo.parentSeriesId, [todo.seriesId]);
    }
  }
  const family = new Set<string>([rootId]);
  const pending = [rootId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id) continue;
    for (const child of children.get(id) ?? []) {
      if (family.has(child)) continue;
      family.add(child);
      pending.push(child);
    }
  }
  return family;
}

function sameTags(left: string[], right: string[]) {
  return left.length === right.length && left.every((tag, index) => tag === right[index]);
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  todos: [],
  statuses: [],
  views: [],

  addTodo: (pageId, date, title) => {
    const id = crypto.randomUUID();
    const seriesId = crypto.randomUUID();
    const now = Date.now();
    const name = title.trim();
    if (!name) return "";
    set((state) => {
      const sortOrder =
        state.todos.reduce(
          (max, todo) => (todo.pageId === pageId ? Math.max(max, todo.sortOrder) : max),
          0,
        ) + 1;
      return {
        todos: [
          ...state.todos,
          {
            id,
            pageId,
            date,
            title: name,
            body: "",
            tags: [],
            status: "pending",
            seriesId,
            parentSeriesId: "",
            sortOrder,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            trashedWith: "",
          },
        ],
      };
    });
    return id;
  },

  addSeries: (pageId, dates, draft) => {
    const name = draft.title.trim();
    const unique = [...new Set(dates)].sort();
    if (!name || unique.length === 0) return "";
    const seriesId = crypto.randomUUID();
    const now = Date.now();
    const body = draft.body.trim();
    const tags = [...draft.tags];
    set((state) => {
      const sortOrder =
        state.todos.reduce(
          (max, todo) => (todo.pageId === pageId ? Math.max(max, todo.sortOrder) : max),
          0,
        ) + 1;
      return {
        todos: [
          ...state.todos,
          ...unique.map((date) => ({
            id: crypto.randomUUID(),
            pageId,
            date,
            title: name,
            body,
            tags,
            status: "pending",
            seriesId,
            parentSeriesId: "",
            sortOrder,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            trashedWith: "",
          })),
        ],
      };
    });
    return seriesId;
  },

  addChildSeries: (pageId, parentSeriesId, dates, draft) => {
    const name = draft.title.trim();
    const unique = [...new Set(dates)].sort();
    if (!name || !parentSeriesId || unique.length === 0) return "";
    const current = get();
    const parentDays = current.todos.filter(
      (todo) => todo.seriesId === parentSeriesId && todo.pageId === pageId,
    );
    const parent = parentDays[0];
    if (!parent || parent.parentSeriesId || parent.deletedAt != null) return "";
    const parentStart = parentDays.reduce(
      (min, todo) => (todo.date < min ? todo.date : min),
      parent.date,
    );
    const parentEnd = parentDays.reduce(
      (max, todo) => (todo.date > max ? todo.date : max),
      parent.date,
    );
    const allowed = unique.filter((date) => date >= parentStart && date <= parentEnd);
    if (allowed.length === 0) return "";
    const seriesId = crypto.randomUUID();
    const now = Date.now();
    const body = draft.body.trim();
    const tags = [...draft.tags];
    const sortOrder =
      current.todos.reduce(
        (max, todo) => (todo.pageId === pageId ? Math.max(max, todo.sortOrder) : max),
        0,
      ) + 1;
    set((state) => ({
      todos: [
        ...state.todos,
        ...allowed.map((date) => ({
          id: crypto.randomUUID(),
          pageId,
          date,
          title: name,
          body,
          tags,
          status: "pending",
          seriesId,
          parentSeriesId,
          sortOrder,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          trashedWith: "",
        })),
      ],
    }));
    return seriesId;
  },

  updateTitle: (id, title) => {
    const name = title.trim();
    if (!name) return;
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id && todo.title !== name
          ? { ...todo, title: name, updatedAt: Date.now() }
          : todo,
      ),
    }));
  },

  renameSeries: (seriesId, title) => {
    const name = title.trim();
    if (!name) return;
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.seriesId === seriesId && todo.title !== name
          ? { ...todo, title: name, updatedAt: Date.now() }
          : todo,
      ),
    }));
  },

  setSeriesBody: (seriesId, body) => {
    const next = body.trim();
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.seriesId === seriesId && todo.body !== next
          ? { ...todo, body: next, updatedAt: Date.now() }
          : todo,
      ),
    }));
  },

  setSeriesTags: (seriesId, tags) => {
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.seriesId === seriesId && !sameTags(todo.tags, tags)
          ? { ...todo, tags, updatedAt: Date.now() }
          : todo,
      ),
    }));
  },

  setSeriesSpan: (seriesId, start, end) => {
    set((state) => {
      const existing = state.todos
        .filter((todo) => todo.seriesId === seriesId)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const sample = existing[0];
      if (!sample) return state;
      let dates = datesFrom(start, end).filter((date) => parseIso(date));
      if (sample.parentSeriesId) {
        const parentDays = state.todos.filter((todo) => todo.seriesId === sample.parentSeriesId);
        const parent = parentDays[0];
        if (parent) {
          const parentStart = parentDays.reduce(
            (min, todo) => (todo.date < min ? todo.date : min),
            parent.date,
          );
          const parentEnd = parentDays.reduce(
            (max, todo) => (todo.date > max ? todo.date : max),
            parent.date,
          );
          dates = dates.filter((date) => date >= parentStart && date <= parentEnd);
        }
      }
      if (dates.length === 0) return state;
      const sameSpan = existing.map((todo) => todo.date).join("\0") === dates.join("\0");
      const byDate = new Map(existing.map((todo) => [todo.date, todo]));
      const now = Date.now();
      const nextDays = sameSpan
        ? existing
        : dates.map((date) => {
            const kept = byDate.get(date);
            if (kept) return kept;
            return {
              id: crypto.randomUUID(),
              pageId: sample.pageId,
              date,
              title: sample.title,
              body: sample.body,
              tags: [...sample.tags],
              status: "pending",
              seriesId,
              parentSeriesId: sample.parentSeriesId,
              sortOrder: sample.sortOrder,
              createdAt: now,
              updatedAt: now,
              deletedAt: sample.deletedAt,
              trashedWith: sample.trashedWith,
            };
          });
      const allowed = new Set(dates);
      const todos = (
        sameSpan
          ? state.todos
          : [...state.todos.filter((todo) => todo.seriesId !== seriesId), ...nextDays]
      ).filter((todo) => todo.parentSeriesId !== seriesId || allowed.has(todo.date));
      if (todos.length === state.todos.length && sameSpan) return state;
      return { todos };
    });
  },

  setStatus: (id, status) => {
    const next = status.trim();
    if (!next) return;
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id && todo.status !== next
          ? { ...todo, status: next, updatedAt: Date.now() }
          : todo,
      ),
    }));
  },

  renameStatus: (pageId, id, name) => {
    const next = name.trim();
    if (!next) return;
    set((state) => {
      const current = statusesFor(state.statuses, pageId).map((status) =>
        status.id === id && status.name !== next ? { ...status, name: next } : status,
      );
      return { statuses: replacePageStatuses(state.statuses, pageId, current) };
    });
  },

  recolorStatus: (pageId, id, color) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    const next = color.toLowerCase();
    set((state) => {
      const current = statusesFor(state.statuses, pageId).map((status) =>
        status.id === id && status.color !== next ? { ...status, color: next } : status,
      );
      return { statuses: replacePageStatuses(state.statuses, pageId, current) };
    });
  },

  addStatus: (pageId, name, color) => {
    const label = name.trim();
    if (!label || !/^#[0-9a-fA-F]{6}$/.test(color)) return "";
    const id = crypto.randomUUID();
    set((state) => {
      const current = statusesFor(state.statuses, pageId);
      const sortOrder = current.reduce((max, status) => Math.max(max, status.sortOrder), 0) + 1;
      return {
        statuses: replacePageStatuses(state.statuses, pageId, [
          ...current,
          { id, pageId, name: label, color: color.toLowerCase(), sortOrder },
        ]),
      };
    });
    return id;
  },

  removeStatus: (pageId, id) => {
    if (isBuiltinStatus(id)) return;
    set((state) => {
      const current = statusesFor(state.statuses, pageId).filter((status) => status.id !== id);
      if (current.length === statusesFor(state.statuses, pageId).length) return state;
      const now = Date.now();
      return {
        statuses: replacePageStatuses(state.statuses, pageId, current),
        todos: state.todos.map((todo) =>
          todo.pageId === pageId && todo.status === id
            ? { ...todo, status: "pending", updatedAt: now }
            : todo,
        ),
      };
    });
  },

  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),

  removeSeries: (seriesId) =>
    set((state) => {
      const sample = state.todos.find((todo) => todo.seriesId === seriesId && todo.deletedAt == null);
      if (!sample) return state;
      const stamp = Date.now();
      return {
        todos: state.todos.map((todo) => {
          if (todo.seriesId === seriesId) {
            return { ...todo, deletedAt: stamp, trashedWith: "", updatedAt: stamp };
          }
          if (todo.parentSeriesId === seriesId && todo.deletedAt == null) {
            return { ...todo, deletedAt: stamp, trashedWith: seriesId, updatedAt: stamp };
          }
          return todo;
        }),
      };
    }),

  restoreSeries: (seriesId) => {
    const family = seriesFamily(get().todos, seriesId);
    const stamp = Date.now();
    set((state) => ({
      todos: state.todos.map((todo) =>
        family.has(todo.seriesId) && todo.deletedAt != null
          ? { ...todo, deletedAt: null, trashedWith: "", updatedAt: stamp }
          : todo,
      ),
    }));
  },

  restorePages: (pageIds) =>
    set((state) => {
      const ids = new Set(pageIds);
      const stamp = Date.now();
      let changed = false;
      const todos = state.todos.map((todo) => {
        if (!ids.has(todo.pageId) || todo.deletedAt == null) return todo;
        changed = true;
        return { ...todo, deletedAt: null, trashedWith: "", updatedAt: stamp };
      });
      return changed ? { todos } : state;
    }),

  purgeSeries: (seriesId) =>
    set((state) => ({
      todos: state.todos.filter(
        (todo) => todo.seriesId !== seriesId && todo.parentSeriesId !== seriesId,
      ),
    })),

  removePages: (pageIds) =>
    set((state) => {
      const ids = new Set(pageIds);
      const todos = state.todos.filter((todo) => !ids.has(todo.pageId));
      const statuses = state.statuses.filter((status) => !ids.has(status.pageId));
      const views = state.views.filter((view) => !ids.has(view.pageId));
      if (
        todos.length === state.todos.length &&
        statuses.length === state.statuses.length &&
        views.length === state.views.length
      ) {
        return state;
      }
      return { todos, statuses, views };
    }),

  setTimelineView: (pageId, view) => {
    const next = { pageId, ...view };
    const keep = next.sorts.length > 0 || next.filters.length > 0;
    set((state) => ({
      views: [
        ...state.views.filter((item) => item.pageId !== pageId),
        ...(keep ? [next] : []),
      ],
    }));
  },

  hydrate: async () => {
    persistEnabled = false;
    const [loadedTodos, loadedStatuses, loadedViews] = await Promise.all([
      loadTodos(),
      loadTodoStatuses(),
      loadTimelineViews(),
    ]);
    const pageIds = new Set(useSidebarStore.getState().pages.map((page) => page.id));
    const todos = (loadedTodos ?? []).filter((todo) => pageIds.has(todo.pageId));
    const statuses = (loadedStatuses ?? []).filter((status) => pageIds.has(status.pageId));
    const localViews = readLocalTimelineViews().filter((view) => pageIds.has(view.pageId));
    let views = (loadedViews ?? localViews).filter((view) => pageIds.has(view.pageId));
    let carriedLocal = false;
    if (loadedViews) {
      const savedPages = new Set(views.map((view) => view.pageId));
      const carried = localViews.filter((view) => !savedPages.has(view.pageId));
      if (carried.length > 0) {
        views = [...views, ...carried];
        carriedLocal = true;
      }
      clearLocalTimelineViews();
    }
    set({ todos, statuses, views });
    lastSaved = JSON.stringify({ todos, statuses, views });
    persistEnabled = true;
    const droppedTodos = loadedTodos != null && loadedTodos.length !== todos.length;
    const droppedStatuses = loadedStatuses != null && loadedStatuses.length !== statuses.length;
    const droppedViews = loadedViews != null && loadedViews.length !== views.length;
    if (droppedTodos || droppedStatuses || droppedViews || carriedLocal) {
      queued = { todos, statuses, views };
      void flush();
    }
  },
}));

useSidebarStore.subscribe((state, previous) => {
  const removed = previous.pages
    .filter((page) => !state.pages.some((item) => item.id === page.id))
    .map((page) => page.id);
  if (removed.length > 0) useTimelineStore.getState().removePages(removed);
});

type TimelineSnapshot = {
  todos: TimelineTodo[];
  statuses: TodoStatusDef[];
  views: SavedTimelineView[];
};

let persistEnabled = false;
let lastSaved = "";
let writing = false;
let queued: TimelineSnapshot | null = null;

async function flush() {
  if (writing) return;
  writing = true;
  while (queued) {
    const next = queued;
    queued = null;
    try {
      await saveTodos(next.todos, next.statuses, next.views);
      lastSaved = JSON.stringify(next);
    } catch {
      if (!queued) queued = next;
      break;
    }
  }
  writing = false;
}

useTimelineStore.subscribe((state) => {
  if (!persistEnabled) return;
  const snapshot = { todos: state.todos, statuses: state.statuses, views: state.views };
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastSaved) return;
  queued = snapshot;
  void flush();
});
