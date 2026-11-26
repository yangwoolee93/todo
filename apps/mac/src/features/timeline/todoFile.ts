import { invoke } from "@tauri-apps/api/core";
import type { TimelineTodo, TodoStatusDef } from "../../stores/useTimelineStore";
import { parseIso } from "./days";
import {
  parseTimelineViews,
  writeLocalTimelineViews,
  type SavedTimelineView,
} from "./view";

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function parseTodos(value: unknown): TimelineTodo[] {
  if (!Array.isArray(value)) return [];
  const todos: TimelineTodo[] = [];
  for (const item of value) {
    const todo = parseTodo(item);
    if (!todo || todos.some((saved) => saved.id === todo.id)) continue;
    todos.push(todo);
  }
  return todos;
}

export function parseTodoStatuses(value: unknown): TodoStatusDef[] {
  if (!Array.isArray(value)) return [];
  const statuses: TodoStatusDef[] = [];
  for (const item of value) {
    const status = parseStatus(item);
    if (!status || statuses.some((saved) => saved.pageId === status.pageId && saved.id === status.id)) {
      continue;
    }
    statuses.push(status);
  }
  return statuses;
}

export async function loadTodos(): Promise<TimelineTodo[] | null> {
  if (!inTauri()) return null;
  try {
    return parseTodos(await invoke("load_todos"));
  } catch {
    return null;
  }
}

export async function loadTodoStatuses(): Promise<TodoStatusDef[] | null> {
  if (!inTauri()) return null;
  try {
    return parseTodoStatuses(await invoke("load_todo_statuses"));
  } catch {
    return null;
  }
}

export async function loadTimelineViews(): Promise<SavedTimelineView[] | null> {
  if (!inTauri()) return null;
  try {
    return parseTimelineViews(await invoke("load_timeline_views"));
  } catch {
    return null;
  }
}

export async function saveTodos(
  todos: TimelineTodo[],
  statuses: TodoStatusDef[],
  views: SavedTimelineView[],
) {
  if (!inTauri()) {
    writeLocalTimelineViews(views);
    return;
  }
  await invoke("save_todos", { todos, statuses, views });
}

function parseTodo(value: unknown): TimelineTodo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id);
  const pageId = text(raw.pageId);
  const date = text(raw.date);
  const seriesId = text(raw.seriesId);
  const status = text(raw.status);
  if (!id || !pageId || !date || !parseIso(date) || !seriesId || !status) return null;
  if (typeof raw.title !== "string") return null;
  if (!number(raw.sortOrder) || !number(raw.createdAt) || !number(raw.updatedAt)) {
    return null;
  }
  const deletedAt = stamp(raw.deletedAt);
  return {
    id,
    pageId,
    date,
    title: raw.title,
    body: typeof raw.body === "string" ? raw.body : "",
    tags: parseTags(raw.tags),
    status,
    checks: parseChecks(raw.checks),
    seriesId,
    parentSeriesId: text(raw.parentSeriesId) ?? "",
    sortOrder: raw.sortOrder as number,
    createdAt: raw.createdAt as number,
    updatedAt: raw.updatedAt as number,
    deletedAt,
    omittedAt: stamp(raw.omittedAt),
    trashedWith: deletedAt == null ? "" : (text(raw.trashedWith) ?? ""),
  };
}

function parseStatus(value: unknown): TodoStatusDef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id);
  const pageId = text(raw.pageId);
  const name = text(raw.name);
  const color = text(raw.color);
  if (!id || !pageId || !name || !color || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  if (!number(raw.sortOrder)) return null;
  return {
    id,
    pageId,
    name,
    color: color.toLowerCase(),
    sortOrder: raw.sortOrder as number,
    updatedAt: number(raw.updatedAt) ? (raw.updatedAt as number) : 0,
    deletedAt: stamp(raw.deletedAt),
  };
}

function parseChecks(value: unknown) {
  if (!Array.isArray(value)) return [];
  const checks: TimelineTodo["checks"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const id = text(raw.id);
    if (!id || typeof raw.text !== "string" || typeof raw.done !== "boolean") continue;
    const label = raw.text.trim();
    if (!label || checks.some((check) => check.id === id)) continue;
    checks.push({ id, text: label, done: raw.done });
  }
  return checks;
}

function parseTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim().replace(/^#+/, "");
    if (!name || tags.includes(name)) continue;
    tags.push(name);
  }
  return tags;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
