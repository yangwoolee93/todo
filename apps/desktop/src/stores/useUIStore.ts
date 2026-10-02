import { create } from "zustand";
import type { AppView } from "@renderer/types/views";
import type { DisplayTodo } from "@shared/types/todo";
import { getTodayString } from "@renderer/utils/dateUtils";

export type SettingsSection = "home" | "theme" | "data" | "info";

type UIState = {
  view: AppView;
  settingsSection: SettingsSection;
  activeDate: string;
  addModalOpen: boolean;
  duplicateContent: string | undefined;
  childParentId: string | null;
  childGroupKey: string | null;
  editTarget: DisplayTodo | null;
  deleteTarget: DisplayTodo | null;
  deleteChildrenTarget: DisplayTodo | null;
};

type UIActions = {
  goTodoView: () => void;
  goMemoView: () => void;
  goSettingsView: () => void;
  setSettingsSection: (section: SettingsSection) => void;
  setActiveDate: (activeDate: string) => void;
  openAddModal: () => void;
  openAddModalWithDuplicate: (content: string) => void;
  openAddChild: (parentId: string, groupKey: string) => void;
  closeAddModal: () => void;
  setEditTarget: (todo: DisplayTodo | null) => void;
  setDeleteTarget: (todo: DisplayTodo | null) => void;
  setDeleteChildrenTarget: (todo: DisplayTodo | null) => void;
};

type UIStore = UIState & UIActions;

const initialState: UIState = {
  view: "todo",
  settingsSection: "home",
  activeDate: getTodayString(),
  addModalOpen: false,
  duplicateContent: undefined,
  childParentId: null,
  childGroupKey: null,
  editTarget: null,
  deleteTarget: null,
  deleteChildrenTarget: null,
};

const createActions = (
  set: (fn: (prev: UIStore) => Partial<UIStore>) => void,
  get: () => UIStore,
): UIActions => ({
  goTodoView: () => set(() => ({ view: "todo" })),
  goMemoView: () => set(() => ({ view: "memo" })),
  goSettingsView: () => {
    const { view, settingsSection } = get();
    if (view === "settings" && settingsSection !== "home") {
      history.back();
    }
    set(() => ({ view: "settings", settingsSection: "home" }));
  },
  setSettingsSection: (settingsSection) => set(() => ({ settingsSection })),
  setActiveDate: (activeDate: string) => set(() => ({ activeDate })),
  openAddModal: () =>
    set(() => ({
      addModalOpen: true,
      duplicateContent: undefined,
      childParentId: null,
      childGroupKey: null,
    })),
  openAddModalWithDuplicate: (content) =>
    set(() => ({
      addModalOpen: true,
      duplicateContent: content,
      childParentId: null,
      childGroupKey: null,
    })),
  openAddChild: (parentId, groupKey) =>
    set(() => ({
      addModalOpen: true,
      duplicateContent: undefined,
      childParentId: parentId,
      childGroupKey: groupKey,
    })),
  closeAddModal: () =>
    set(() => ({
      addModalOpen: false,
      duplicateContent: undefined,
      childParentId: null,
      childGroupKey: null,
    })),
  setEditTarget: (todo) => set(() => ({ editTarget: todo })),
  setDeleteTarget: (todo) => set(() => ({ deleteTarget: todo })),
  setDeleteChildrenTarget: (todo) => set(() => ({ deleteChildrenTarget: todo })),
});

export const useUIStore = create<UIStore>()((set, get) => ({
  ...initialState,
  ...createActions(set, get),
}));
