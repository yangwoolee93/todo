import { create } from "zustand";
import type { AppView } from "@renderer/types/views";
import type { DisplayTodo } from "@shared/types/todo";
import { getTodayString } from "@renderer/utils/dateUtils";
import { shiftDate, buildDateString } from "@renderer/utils/dateUtils";

type UIState = {
  view: AppView;
  activeDate: string;
  datePickerOpen: boolean;
  addModalOpen: boolean;
  duplicateContent: string | undefined;
  editTarget: DisplayTodo | null;
  deleteTarget: DisplayTodo | null;
};

type UIActions = {
  // view Actions
  goTodayView: () => void;
  goMonthView: () => void;
  goSettingsView: () => void;
  // activeDate Actions
  setActiveDate: (activeDate: string) => void;
  goTodayDate: () => void;
  goPrevDate: () => void;
  goNextDate: () => void;
  setActiveDateByYearMonth: (yearMonth: string) => void;
  // datePickerOpen Actions
  openDatePicker: () => void;
  closeDatePicker: () => void;
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
  datePickerOpen: false,
  addModalOpen: false,
  duplicateContent: undefined,
  editTarget: null,
  deleteTarget: null,
};

const createActions = (
  set: (fn: (prev: UIStore) => Partial<UIStore>) => void,
): UIActions => ({
  goTodayView: () => set(() => ({ view: "today" })),
  goMonthView: () => set(() => ({ view: "month" })),
  goSettingsView: () => set(() => ({ view: "settings" })),
  //
  setActiveDate: (activeDate: string) => set(() => ({ activeDate })),
  goTodayDate: () => set(() => ({ activeDate: getTodayString() })),
  goPrevDate: () =>
    set((state) => ({ activeDate: shiftDate(state.activeDate, -1) })),
  goNextDate: () =>
    set((state) => ({ activeDate: shiftDate(state.activeDate, 1) })),
  setActiveDateByYearMonth: (yearMonth: string) =>
    set(() => ({ activeDate: buildDateString(yearMonth, 1) })),
  //
  openDatePicker: () => set(() => ({ datePickerOpen: true })),
  closeDatePicker: () => set(() => ({ datePickerOpen: false })),
  //
  openAddModal: () =>
    set(() => ({ addModalOpen: true, duplicateContent: undefined })),
  openAddModalWithDuplicate: (content) =>
    set(() => ({ addModalOpen: true, duplicateContent: content })),
  closeAddModal: () =>
    set(() => ({ addModalOpen: false, duplicateContent: undefined })),
  setEditTarget: (todo) => set(() => ({ editTarget: todo })),
  setDeleteTarget: (todo) => set(() => ({ deleteTarget: todo })),
});

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,
  ...createActions(set),
}));
