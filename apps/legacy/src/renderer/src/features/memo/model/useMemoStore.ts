import type { CreateMemoPayload, MemoItem, UpdateMemoPayload } from "@shared/types/memo";
import { create } from "zustand";

type MemoState = {
  memos: MemoItem[];
  loading: boolean;
  error: string | null;
};

type MemoActions = {
  loadMemos: () => Promise<void>;
  createMemo: (payload: CreateMemoPayload) => Promise<boolean>;
  updateMemo: (payload: UpdateMemoPayload) => Promise<boolean>;
  deleteMemo: (id: number) => Promise<boolean>;
  clearError: () => void;
};

type MemoStore = MemoState & MemoActions;

const initialState: MemoState = {
  memos: [],
  loading: true,
  error: null,
};

export const useMemoStore = create<MemoStore>()((set) => ({
  ...initialState,

  loadMemos: async () => {
    set(() => ({ loading: true, error: null }));
    try {
      const result = await window.api.listMemos();
      if (!result.success) throw new Error(result.error ?? "메모 조회 실패");
      set(() => ({ memos: result.data ?? [] }));
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
      const list = await window.api.listMemos();
      if (list.success) set(() => ({ memos: list.data ?? [] }));
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
      const list = await window.api.listMemos();
      if (list.success) set(() => ({ memos: list.data ?? [] }));
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
      const list = await window.api.listMemos();
      if (list.success) set(() => ({ memos: list.data ?? [] }));
      return true;
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "메모 삭제 실패",
      }));
      return false;
    }
  },

  clearError: () => set(() => ({ error: null })),
}));
