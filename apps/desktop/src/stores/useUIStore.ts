import { create } from "zustand";
import type { AppView } from "@renderer/types/views";
import type { DisplayTodo } from "@shared/types/todo";
import { getTodayString, shiftDate } from "@renderer/utils/dateUtils";

export type SettingsSection = "home" | "theme" | "data" | "info";

type UIState = {
  view: AppView;
  settingsSection: SettingsSection;
  activeDate: string;
  addModalOpen: boolean;
  duplicateContent: string | undefined;
  editTarget: DisplayTodo | null;
  deleteTarget: DisplayTodo | null;
};

type UIActions = {
  // view Actions
  goDesignView: () => void;
  goTodoView: () => void;
  goMemoView: () => void;
  goScheduleView: () => void;
  goSettingsView: () => void;
  setSettingsSection: (section: SettingsSection) => void;
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
  view: "todo",
  settingsSection: "home",
  activeDate: getTodayString(),
  addModalOpen: false,
  duplicateContent: undefined,
  editTarget: null,
  deleteTarget: null,
};

const createActions = (
  set: (fn: (prev: UIStore) => Partial<UIStore>) => void,
  get: () => UIStore,
): UIActions => ({
  goDesignView: () => set(() => ({ view: "design" })),
  goTodoView: () => set(() => ({ view: "todo" })),
  goMemoView: () => set(() => ({ view: "memo" })),
  goScheduleView: () => set(() => ({ view: "schedule" })),
  goSettingsView: () => {
    const { view, settingsSection } = get();
    if (view === "settings" && settingsSection !== "home") {
      history.back();
    }
    set(() => ({ view: "settings", settingsSection: "home" }));
  },
  setSettingsSection: (settingsSection) => set(() => ({ settingsSection })),
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

export const useUIStore = create<UIStore>()((set, get) => ({
  ...initialState,
  ...createActions(set, get),
}));
