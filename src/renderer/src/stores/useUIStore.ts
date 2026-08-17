import { create } from "zustand";
import type { AppView } from "@renderer/types/views";
import type { DisplayTodo } from "@shared/types/todo";
import { getTodayString, shiftDate } from "@renderer/utils/dateUtils";

type UIState = {
  view: AppView;
  activeDate: string;
  addModalOpen: boolean;
  duplicateContent: string | undefined;
  editTarget: DisplayTodo | null;
  deleteTarget: DisplayTodo | null;
};

type UIActions = {
  // view Actions
  goTodayView: () => void;
  goMonthView: () => void;
  goMemoView: () => void;
  goScheduleView: () => void;
  goSettingsView: () => void;
  // activeDate Actions
  setActiveDate: (activeDate: string) => void;
  goTodayDate: () => void;
  goPrevDate: () => void;
  goNextDate: () => void;
  // addModal Actions
  openAddModal: () => void;
  openAddModalWithDuplicate: (content: string) => void;
  closeAddModal: () => void;
  // 편집/삭제 모달 대상
  setEditTarget: (todo: DisplayTodo | null) => void;
  setDeleteTarget: (todo: DisplayTodo | null) => void;
};

type UIStore = UIState & UIActions;

const initialState: UIState = {
  view: "today",
  activeDate: getTodayString(),
  addModalOpen: false,
  duplicateContent: undefined,
  editTarget: null,
  deleteTarget: null,
};

const createActions = (set: (fn: (prev: UIStore) => Partial<UIStore>) => void): UIActions => ({
  goTodayView: () => set(() => ({ view: "today" })),
  goMonthView: () => set(() => ({ view: "month" })),
  goMemoView: () => set(() => ({ view: "memo" })),
  goScheduleView: () => set(() => ({ view: "schedule" })),
  goSettingsView: () => set(() => ({ view: "settings" })),
  //
  setActiveDate: (activeDate: string) => set(() => ({ activeDate })),
  goTodayDate: () => set(() => ({ activeDate: getTodayString() })),
  goPrevDate: () => set((state) => ({ activeDate: shiftDate(state.activeDate, -1) })),
  goNextDate: () => set((state) => ({ activeDate: shiftDate(state.activeDate, 1) })),
  //
  openAddModal: () => set(() => ({ addModalOpen: true, duplicateContent: undefined })),
  openAddModalWithDuplicate: (content) =>
    set(() => ({ addModalOpen: true, duplicateContent: content })),
  closeAddModal: () => set(() => ({ addModalOpen: false, duplicateContent: undefined })),
  setEditTarget: (todo) => set(() => ({ editTarget: todo })),
  setDeleteTarget: (todo) => set(() => ({ deleteTarget: todo })),
});

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,
  ...createActions(set),
}));
