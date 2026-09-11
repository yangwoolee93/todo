import { DaySummary } from "@shared/types/todo";
import { getTodayString, toYearMonth } from "@renderer/utils/dateUtils";
import { create } from "zustand";

export type MonthViewMode = "columns" | "timeline";

type MonthState = {
  yearMonth: string;
  viewMode: MonthViewMode;
  summaries: DaySummary[];
  loading: boolean;
  error: string | null;
};

type MonthActions = {
  setYearMonth: (yearMonth: string) => void;
  setViewMode: (mode: MonthViewMode) => void;
  loadMonthSummary: (yearMonth: string) => Promise<void>;
  clearError: () => void;
};

type MonthStore = MonthState & MonthActions;

const initialState: MonthState = {
  yearMonth: toYearMonth(getTodayString()),
  viewMode: "timeline",
  summaries: [],
  loading: true,
  error: null,
};

const createActions = (
  set: (fn: (prev: MonthStore) => Partial<MonthStore>) => void,
): MonthActions => ({
  setYearMonth: (yearMonth) => set(() => ({ yearMonth })),

  setViewMode: (viewMode) => set(() => ({ viewMode })),

  loadMonthSummary: async (yearMonth) => {
    set(() => ({ loading: true, error: null }));
    try {
      const result = await window.api.getMonthSummary(yearMonth);
      if (!result.success) throw new Error(result.error ?? "월별 데이터 조회 실패");
      set(() => ({ summaries: result.data ?? [] }));
    } catch (err) {
      set(() => ({
        error: err instanceof Error ? err.message : "데이터 로드 실패",
      }));
    } finally {
      set(() => ({ loading: false }));
    }
  },

  clearError: () => set(() => ({ error: null })),
});

export const useMonthStore = create<MonthStore>()((set) => ({
  ...initialState,
  ...createActions(set),
}));
