import { create } from "zustand";
import {
  inTauri,
  loadMenu,
  menuPayload,
  saveMenu,
  type MenuSnapshot,
} from "../features/sidebar/menuFile";
import { type PageTypeId } from "../features/sidebar/pageTypes";

export type SidebarGroup = {
  id: string;
  name: string;
  collapsed: boolean;
  updatedAt: number;
};

export type SidebarPage = {
  id: string;
  groupId: string;
  type: PageTypeId;
  name: string;
  updatedAt: number;
};

export type DeleteTarget = {
  kind: "group" | "page";
  id: string;
};

type SidebarState = {
  groups: SidebarGroup[];
  pages: SidebarPage[];
  selectedPageId: string | null;
  selectedGroupId: string | null;
  deleteTarget: DeleteTarget | null;
  hydrated: boolean;
};

type SidebarActions = {
  addGroup: (name: string) => void;
  addPage: (groupId: string, type: PageTypeId, name: string) => void;
  renameGroup: (id: string, name: string) => void;
  renamePage: (id: string, name: string) => void;
  toggleGroup: (id: string) => void;
  selectProject: (id: string) => void;
  selectPage: (id: string) => void;
  requestDelete: (target: DeleteTarget) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  hydrate: () => Promise<void>;
};

function trimmed(value: string) {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function now() {
  return Date.now();
}

export const useSidebarStore = create<SidebarState & SidebarActions>()(
  (set) => ({
    groups: [],
    pages: [],
    selectedPageId: null,
    selectedGroupId: null,
    deleteTarget: null,
    hydrated: !inTauri(),

    addGroup: (name) => {
      const groupName = trimmed(name);
      if (!groupName) return;
      const groupId = crypto.randomUUID();
      set((state) => ({
        groups: [
          ...state.groups,
          { id: groupId, name: groupName, collapsed: false, updatedAt: now() },
        ],
        selectedPageId: null,
        selectedGroupId: groupId,
      }));
    },

    addPage: (groupId, type, name) => {
      const pageName = trimmed(name);
      if (!pageName) return;
      const pageId = crypto.randomUUID();
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === groupId && group.collapsed
            ? { ...group, collapsed: false, updatedAt: now() }
            : group,
        ),
        pages: [
          ...state.pages,
          { id: pageId, groupId, type, name: pageName, updatedAt: now() },
        ],
        selectedPageId: null,
        selectedGroupId: groupId,
      }));
    },

    renameGroup: (id, name) => {
      const groupName = trimmed(name);
      if (!groupName) return;
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === id
            ? { ...group, name: groupName, updatedAt: now() }
            : group,
        ),
      }));
    },

    renamePage: (id, name) => {
      const pageName = trimmed(name);
      if (!pageName) return;
      set((state) => ({
        pages: state.pages.map((page) =>
          page.id === id ? { ...page, name: pageName, updatedAt: now() } : page,
        ),
      }));
    },

    toggleGroup: (id) =>
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === id
            ? { ...group, collapsed: !group.collapsed, updatedAt: now() }
            : group,
        ),
      })),

    selectProject: (id) =>
      set({ selectedGroupId: id, selectedPageId: null }),

    selectPage: (id) =>
      set((state) => {
        const page = state.pages.find((item) => item.id === id);
        if (!page) return {};
        return {
          selectedPageId: id,
          selectedGroupId: null,
          groups: state.groups.map((group) =>
            group.id === page.groupId && group.collapsed
              ? { ...group, collapsed: false, updatedAt: now() }
              : group,
          ),
        };
      }),

    requestDelete: (target) => set({ deleteTarget: target }),

    cancelDelete: () => set({ deleteTarget: null }),

    confirmDelete: () =>
      set((state) => {
        const target = state.deleteTarget;
        if (!target) return {};
        if (target.kind === "page") {
          return {
            pages: state.pages.filter((page) => page.id !== target.id),
            selectedPageId:
              state.selectedPageId === target.id ? null : state.selectedPageId,
            deleteTarget: null,
          };
        }
        const removed = new Set(
          state.pages
            .filter((page) => page.groupId === target.id)
            .map((page) => page.id),
        );
        return {
          groups: state.groups.filter((group) => group.id !== target.id),
          pages: state.pages.filter((page) => page.groupId !== target.id),
          selectedPageId:
            state.selectedPageId && removed.has(state.selectedPageId)
              ? null
              : state.selectedPageId,
          selectedGroupId:
            state.selectedGroupId === target.id ? null : state.selectedGroupId,
          deleteTarget: null,
        };
      }),

    hydrate: async () => {
      persistEnabled = false;
      const menu = await loadMenu();
      if (menu) applyMenu(menu);
      lastSaved = JSON.stringify(menuPayload(snapshot()));
      set({ hydrated: true });
      persistEnabled = true;
    },
  }),
);

let menuExtra: MenuSnapshot["extra"] = {};
let persistEnabled = false;
let lastSaved = "";
let writing = false;
let queued: MenuSnapshot | null = null;

function applyMenu(menu: MenuSnapshot) {
  menuExtra = menu.extra;
  useSidebarStore.setState({
    groups: menu.groups,
    pages: menu.pages,
    selectedPageId: menu.selection.pageId,
    selectedGroupId: menu.selection.groupId,
    deleteTarget: null,
  });
}

function snapshot(): MenuSnapshot {
  const state = useSidebarStore.getState();
  return {
    groups: state.groups,
    pages: state.pages,
    selection: {
      pageId: state.selectedPageId,
      groupId: state.selectedGroupId,
    },
    extra: menuExtra,
  };
}

async function flush() {
  if (writing) return;
  writing = true;
  while (queued) {
    const next = queued;
    queued = null;
    try {
      await saveMenu(next);
      lastSaved = JSON.stringify(menuPayload(next));
    } catch {
      if (!queued) queued = next;
      break;
    }
  }
  writing = false;
}

useSidebarStore.subscribe((state) => {
  if (!persistEnabled || !state.hydrated) return;
  const next = snapshot();
  const serialized = JSON.stringify(menuPayload(next));
  if (serialized === lastSaved) return;
  queued = next;
  void flush();
});
