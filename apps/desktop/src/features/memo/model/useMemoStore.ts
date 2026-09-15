import type {
  CreateMemoPayload,
  MemoCategory,
  MemoItem,
  UpdateMemoPayload,
} from "@shared/types/memo";
import { create } from "zustand";

type MemoState = {
  memos: MemoItem[];
  categories: MemoCategory[];
  loading: boolean;
  error: string | null;
};

type MemoActions = {
  loadMemos: () => Promise<void>;
  createMemo: (payload: CreateMemoPayload) => Promise<boolean>;
  updateMemo: (payload: UpdateMemoPayload) => Promise<boolean>;
  deleteMemo: (id: number) => Promise<boolean>;
  createCategory: (name: string, color: string) => Promise<boolean>;
  updateCategory: (id: number, name: string, color: string) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;
  clearError: () => void;
};

type MemoStore = MemoState & MemoActions;

const initialState: MemoState = {
  memos: [],
  categories: [],
  loading: true,
  error: null,
};

async function reloadLists(): Promise<Pick<MemoState, "memos" | "categories">> {
  const [memos, categories] = await Promise.all([
    window.api.listMemos(),
    window.api.listMemoCategories(),
  ]);
  if (!memos.success) throw new Error(memos.error ?? "메모 조회 실패");
  if (!categories.success) throw new Error(categories.error ?? "분류 조회 실패");
  return {
    memos: memos.data ?? [],
    categories: categories.data ?? [],
  };
}

export const useMemoStore = create<MemoStore>()((set) => ({
  ...initialState,

  loadMemos: async () => {
    set(() => ({ loading: true, error: null }));
    try {
      const lists = await reloadLists();
      set(() => lists);
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "메모 로드 실패",
      }));
    } finally {
      set(() => ({ loading: false }));
    }
  },

  createMemo: async (payload) => {
    try {
      const result = await window.api.createMemo(payload);
      if (!result.success) throw new Error(result.error ?? "메모 생성 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "메모 생성 실패",
      }));
      return false;
    }
  },

  updateMemo: async (payload) => {
    try {
      const result = await window.api.updateMemo(payload);
      if (!result.success) throw new Error(result.error ?? "메모 수정 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "메모 수정 실패",
      }));
      return false;
    }
  },

  deleteMemo: async (id) => {
    try {
      const result = await window.api.deleteMemo(id);
      if (!result.success) throw new Error(result.error ?? "메모 삭제 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "메모 삭제 실패",
      }));
      return false;
    }
  },

  createCategory: async (name, color) => {
    try {
      const result = await window.api.createMemoCategory(name, color);
      if (!result.success) throw new Error(result.error ?? "분류 추가 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "분류 추가 실패",
      }));
      return false;
    }
  },

  updateCategory: async (id, name, color) => {
    try {
      const result = await window.api.updateMemoCategory(id, name, color);
      if (!result.success) throw new Error(result.error ?? "분류 수정 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "분류 수정 실패",
      }));
      return false;
    }
  },

  deleteCategory: async (id) => {
    try {
      const result = await window.api.deleteMemoCategory(id);
      if (!result.success) throw new Error(result.error ?? "분류 삭제 실패");
      const lists = await reloadLists();
      set(() => lists);
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "분류 삭제 실패",
      }));
      return false;
    }
  },

  clearError: () => set(() => ({ error: null })),
}));
