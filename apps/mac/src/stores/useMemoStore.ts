import { create } from "zustand";
import { loadMemos, saveMemos } from "../features/memo/memoFile";
import { useSidebarStore } from "./useSidebarStore";

export type MemoItem = {
  id: string;
  pageId: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  pinnedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type MemoPatch = {
  title?: string;
  body?: string;
  tags?: string[];
};

type MemoState = {
  memos: MemoItem[];
  addMemo: (pageId: string, draft?: MemoPatch) => string;
  updateMemo: (id: string, patch: MemoPatch) => void;
  togglePin: (id: string) => void;
  removeMemo: (id: string) => void;
  restoreMemo: (id: string) => void;
  restorePages: (pageIds: string[]) => void;
  purgeMemo: (id: string) => void;
  removePages: (pageIds: string[]) => void;
  hydrate: () => Promise<void>;
};

export const useMemoStore = create<MemoState>((set) => ({
  memos: [],

  addMemo: (pageId, draft) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    set((state) => ({
      memos: [
        ...state.memos,
        {
          id,
          pageId,
          title: draft?.title ?? "",
          body: draft?.body ?? "",
          tags: draft?.tags ?? [],
          pinned: false,
          pinnedAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    }));
    return id;
  },

  updateMemo: (id, patch) =>
    set((state) => ({
      memos: state.memos.map((memo) =>
        memo.id === id ? { ...memo, ...patch, updatedAt: Date.now() } : memo,
      ),
    })),

  togglePin: (id) =>
    set((state) => ({
      memos: state.memos.map((memo) => {
        if (memo.id !== id) return memo;
        const pinned = !memo.pinned;
        return { ...memo, pinned, pinnedAt: pinned ? Date.now() : null };
      }),
    })),

  removeMemo: (id) =>
    set((state) => ({
      memos: state.memos.map((memo) =>
        memo.id === id && memo.deletedAt == null
          ? { ...memo, deletedAt: Date.now(), updatedAt: Date.now() }
          : memo,
      ),
    })),

  restoreMemo: (id) =>
    set((state) => ({
      memos: state.memos.map((item) =>
        item.id === id && item.deletedAt != null
          ? { ...item, deletedAt: null, updatedAt: Date.now() }
          : item,
      ),
    })),

  restorePages: (pageIds) =>
    set((state) => {
      const ids = new Set(pageIds);
      const stamp = Date.now();
      let changed = false;
      const memos = state.memos.map((memo) => {
        if (!ids.has(memo.pageId) || memo.deletedAt == null) return memo;
        changed = true;
        return { ...memo, deletedAt: null, updatedAt: stamp };
      });
      return changed ? { memos } : state;
    }),

  purgeMemo: (id) =>
    set((state) => ({
      memos: state.memos.filter((memo) => memo.id !== id),
    })),

  removePages: (pageIds) =>
    set((state) => {
      const ids = new Set(pageIds);
      const memos = state.memos.filter((memo) => !ids.has(memo.pageId));
      if (memos.length === state.memos.length) return state;
      return { memos };
    }),

  hydrate: async () => {
    persistEnabled = false;
    const loaded = await loadMemos();
    const pageIds = new Set(
      useSidebarStore.getState().pages.map((page) => page.id),
    );
    const memos = (loaded ?? []).filter((memo) => pageIds.has(memo.pageId));
    set({ memos });
    lastSaved = JSON.stringify(memos);
    persistEnabled = true;
    if (loaded && loaded.length !== memos.length) {
      queued = memos;
      void flush();
    }
  },
}));

useSidebarStore.subscribe((state, previous) => {
  const removed = previous.pages
    .filter((page) => !state.pages.some((item) => item.id === page.id))
    .map((page) => page.id);
  if (removed.length > 0) useMemoStore.getState().removePages(removed);
});

let persistEnabled = false;
let lastSaved = "";
let writing = false;
let queued: MemoItem[] | null = null;

async function flush() {
  if (writing) return;
  writing = true;
  while (queued) {
    const next = queued;
    queued = null;
    try {
      await saveMemos(next);
      lastSaved = JSON.stringify(next);
    } catch {
      if (!queued) queued = next;
      break;
    }
  }
  writing = false;
}

useMemoStore.subscribe((state) => {
  if (!persistEnabled) return;
  const serialized = JSON.stringify(state.memos);
  if (serialized === lastSaved) return;
  queued = state.memos;
  void flush();
});
