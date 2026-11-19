import { create } from "zustand";
import {
  syncHistory,
  visit,
  type HistoryLocation,
} from "../features/sidebar/history";
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
  entries: HistoryLocation[];
  index: number;
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
  back: () => void;
  forward: () => void;
  hydrate: () => Promise<void>;
};

function trimmed(value: string) {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function now() {
  return Date.now();
}

function locationFrom(state: {
  selectedPageId: string | null;
  selectedGroupId: string | null;
}): HistoryLocation {
  if (state.selectedPageId) return { kind: "page", id: state.selectedPageId };
  if (state.selectedGroupId) return { kind: "project", id: state.selectedGroupId };
  return { kind: "empty" };
}

function pushed(
  state: SidebarState,
  partial: Partial<SidebarState>,
): Partial<SidebarState> {
  const history = visit(
    { entries: state.entries, index: state.index },
    locationFrom({ ...state, ...partial }),
  );
  if (history.entries === state.entries && history.index === state.index) {
    return partial;
  }
  return { ...partial, entries: history.entries, index: history.index };
}

function reveal(state: SidebarState, location: HistoryLocation): Partial<SidebarState> {
  if (location.kind === "project") {
    if (!state.groups.some((group) => group.id === location.id)) {
      return { selectedPageId: null, selectedGroupId: null };
    }
    return { selectedPageId: null, selectedGroupId: location.id };
  }
  if (location.kind === "page") {
    const page = state.pages.find((item) => item.id === location.id);
    if (!page) return { selectedPageId: null, selectedGroupId: null };
    return {
      selectedPageId: page.id,
      selectedGroupId: null,
      groups: state.groups.map((group) =>
        group.id === page.groupId && group.collapsed
          ? { ...group, collapsed: false, updatedAt: now() }
          : group,
      ),
    };
  }
  return { selectedPageId: null, selectedGroupId: null };
}

function remembered(
  state: SidebarState,
  partial: Partial<SidebarState>,
): Partial<SidebarState> {
  const next = { ...state, ...partial };
  const history = syncHistory(
    { entries: state.entries, index: state.index },
    (location) =>
      location.kind === "empty" ||
      (location.kind === "project"
        ? next.groups.some((group) => group.id === location.id)
        : next.pages.some((page) => page.id === location.id)),
    locationFrom(next),
  );
  return { ...partial, entries: history.entries, index: history.index };
}

function step(state: SidebarState, delta: number): Partial<SidebarState> {
  const index = state.index + delta;
  if (index < 0 || index >= state.entries.length) return {};
  const partial = reveal(state, state.entries[index]);
  const next = { ...state, ...partial };
  const actual = locationFrom(next);
  const history = syncHistory(
    { entries: state.entries, index },
    (location) =>
      location.kind === "empty" ||
      (location.kind === "project"
        ? next.groups.some((group) => group.id === location.id)
        : next.pages.some((page) => page.id === location.id)),
    actual,
  );
  return { ...partial, entries: history.entries, index: history.index };
}

export const useSidebarStore = create<SidebarState & SidebarActions>()(
  (set) => ({
    groups: [],
    pages: [],
    selectedPageId: null,
    selectedGroupId: null,
    deleteTarget: null,
    hydrated: !inTauri(),
    entries: [{ kind: "empty" }],
    index: 0,

    addGroup: (name) => {
      const groupName = trimmed(name);
      if (!groupName) return;
      const groupId = crypto.randomUUID();
      set((state) =>
        pushed(state, {
          groups: [
            ...state.groups,
            {
              id: groupId,
              name: groupName,
              collapsed: false,
              updatedAt: now(),
            },
          ],
          selectedPageId: null,
          selectedGroupId: groupId,
        }),
      );
    },

    addPage: (groupId, type, name) => {
      const pageName = trimmed(name);
      if (!pageName) return;
      const pageId = crypto.randomUUID();
      set((state) =>
        pushed(state, {
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
        }),
      );
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
      set((state) =>
        pushed(state, { selectedGroupId: id, selectedPageId: null }),
      ),

    selectPage: (id) =>
      set((state) => {
        const page = state.pages.find((item) => item.id === id);
        if (!page) return {};
        return pushed(state, {
          selectedPageId: id,
          selectedGroupId: null,
          groups: state.groups.map((group) =>
            group.id === page.groupId && group.collapsed
              ? { ...group, collapsed: false, updatedAt: now() }
              : group,
          ),
        });
      }),

    requestDelete: (target) => set({ deleteTarget: target }),

    cancelDelete: () => set({ deleteTarget: null }),

    confirmDelete: () =>
      set((state) => {
        const target = state.deleteTarget;
        if (!target) return {};
        if (target.kind === "page") {
          return remembered(state, {
            pages: state.pages.filter((page) => page.id !== target.id),
            selectedPageId:
              state.selectedPageId === target.id ? null : state.selectedPageId,
            deleteTarget: null,
          });
        }
        const removed = new Set(
          state.pages
            .filter((page) => page.groupId === target.id)
            .map((page) => page.id),
        );
        const partial = {
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
        return remembered(state, partial);
      }),

    back: () => set((state) => step(state, -1)),

    forward: () => set((state) => step(state, 1)),

    hydrate: async () => {
      persistEnabled = false;
      const menu = await loadMenu();
      if (menu) applyMenu(menu);
      lastSaved = JSON.stringify(menuPayload(snapshot()));
      set((state) => ({
        hydrated: true,
        entries: [locationFrom(state)],
        index: 0,
      }));
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
