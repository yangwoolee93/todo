import type { CreateMemoPayload, MemoItem, UpdateMemoPayload } from "@shared/types/memo";
import { mutateStore, readStore } from "./storage";

function isMemoKind(value: unknown): value is MemoItem["kind"] {
  return value === "routine" || value === "planned";
}

function normalizeMemo(raw: Record<string, unknown>): MemoItem | null {
  const id = typeof raw.id === "number" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (id === null || !title || !isMemoKind(raw.kind)) {
    return null;
  }

  return {
    id,
    kind: raw.kind,
    title,
    note: typeof raw.note === "string" ? raw.note : "",
    created_at: typeof raw.created_at === "number" ? raw.created_at : id,
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
  };
}

export function normalizeMemos(memos: unknown[]): MemoItem[] {
  return memos
    .map((item) => normalizeMemo(item as Record<string, unknown>))
    .filter((item): item is MemoItem => item !== null);
}

function nextMemoId(memos: MemoItem[]): number {
  if (memos.length === 0) return 1;
  return Math.max(...memos.map((item) => item.id)) + 1;
}

function nextSortOrder(memos: MemoItem[], kind: MemoItem["kind"]): number {
  const sameKind = memos.filter((item) => item.kind === kind);
  if (sameKind.length === 0) return 0;
  return Math.max(...sameKind.map((item) => item.sort_order)) + 1;
}

function sortMemos(items: MemoItem[]): MemoItem[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at - b.created_at;
  });
}

export function listMemos(): MemoItem[] {
  return sortMemos(normalizeMemos(readStore().memos));
}

export function createMemo(payload: CreateMemoPayload): MemoItem | null {
  const title = payload.title.trim();
  if (!title || !isMemoKind(payload.kind)) return null;

  const note = payload.kind === "planned" ? payload.note.trim() : "";
  let created: MemoItem | null = null;

  mutateStore((store) => {
    store.memos = normalizeMemos(store.memos);
    created = {
      id: nextMemoId(store.memos),
      kind: payload.kind,
      title,
      note,
      created_at: Date.now(),
      sort_order: nextSortOrder(store.memos, payload.kind),
    };
    store.memos.push(created);
  });

  return created;
}

export function updateMemo(payload: UpdateMemoPayload): boolean {
  const title = payload.title.trim();
  if (!title) return false;

  let changed = false;
  mutateStore((store) => {
    store.memos = normalizeMemos(store.memos);
    const item = store.memos.find((memo) => memo.id === payload.id);
    if (!item) return;
    item.title = title;
    item.note = item.kind === "planned" ? payload.note.trim() : "";
    changed = true;
  });

  return changed;
}

export function deleteMemo(id: number): boolean {
  let changed = false;
  mutateStore((store) => {
    const before = store.memos.length;
    store.memos = normalizeMemos(store.memos).filter((item) => item.id !== id);
    changed = store.memos.length < before;
  });
  return changed;
}

export function replaceMemos(memos: unknown[]): void {
  mutateStore((store) => {
    store.memos = normalizeMemos(memos);
  });
}

export function ensureNormalizedMemos(): void {
  mutateStore((store) => {
    store.memos = normalizeMemos(store.memos);
  });
}
