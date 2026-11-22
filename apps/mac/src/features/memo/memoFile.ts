import { invoke } from "@tauri-apps/api/core";
import type { MemoItem } from "../../stores/useMemoStore";

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function parseMemos(value: unknown): MemoItem[] {
  if (!Array.isArray(value)) return [];
  const memos: MemoItem[] = [];
  for (const item of value) {
    const memo = parseMemo(item);
    if (!memo || memos.some((saved) => saved.id === memo.id)) continue;
    memos.push(memo);
  }
  return memos;
}

export async function loadMemos(): Promise<MemoItem[] | null> {
  if (!inTauri()) return null;
  try {
    return parseMemos(await invoke("load_memos"));
  } catch {
    return null;
  }
}

export async function saveMemos(memos: MemoItem[]) {
  if (!inTauri()) return;
  await invoke("save_memos", { memos });
}

function parseMemo(value: unknown): MemoItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id);
  const pageId = text(raw.pageId);
  if (!id || !pageId || typeof raw.title !== "string" || typeof raw.body !== "string") {
    return null;
  }
  const pinned = raw.pinned === true;
  return {
    id,
    pageId,
    title: raw.title,
    body: raw.body,
    tags: tags(raw.tags),
    pinned,
    pinnedAt: pinned ? time(raw.pinnedAt) : null,
    createdAt: time(raw.createdAt) ?? 0,
    updatedAt: time(raw.updatedAt) ?? 0,
  };
}

function tags(value: unknown) {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim().replace(/^#+/, "");
    if (!name || names.includes(name)) continue;
    names.push(name);
  }
  return names;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function time(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
