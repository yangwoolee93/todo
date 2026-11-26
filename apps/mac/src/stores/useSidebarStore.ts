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
import { useSettingsStore } from "./useSettingsStore";

export type SidebarGroup = {
  id: string;
  name: string;
  collapsed: boolean;
  updatedAt: number;
  deletedAt: number | null;
};

export type SidebarPage = {
  id: string;
  groupId: string;
  type: PageTypeId;
  name: string;
  updatedAt: number;
  deletedAt: number | null;
};

type SidebarState = {
  groups: SidebarGroup[];
  pages: SidebarPage[];
  selectedPageId: string | null;
  selectedGroupId: string | null;
  settingsOpen: boolean;
  trashOpen: boolean;
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
  trashGroup: (id: string) => void;
  trashPage: (id: string) => void;
  restoreGroup: (id: string) => void;
  restorePage: (id: string) => void;
  purgeGroup: (id: string) => void;
  purgePage: (id: string) => void;
  back: () => void;
  forward: () => void;
  toggleSettings: () => void;
  toggleTrash: () => void;
  hydrate: () => Promise<void>;
};

function locationAlive(
  location: HistoryLocation,
  groups: SidebarGroup[],
  pages: SidebarPage[],
) {
  if (location.kind === "empty" || location.kind === "settings" || location.kind === "trash") {
    return true;
  }
  if (location.kind === "project") {
    return groups.some((group) => group.id === location.id && group.deletedAt == null);
  }
  const page = pages.find((item) => item.id === location.id && item.deletedAt == null);
  return (
    page != null &&
    groups.some((group) => group.id === page.groupId && group.deletedAt == null)
  );
}

function trimmed(value: string) {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function now() {
  return Date.now();
}

function locationFrom(state: {
  trashOpen: boolean;
  settingsOpen: boolean;
  selectedPageId: string | null;
  selectedGroupId: string | null;
}): HistoryLocation {
  if (state.trashOpen) return { kind: "trash" };
  if (state.settingsOpen) return { kind: "settings" };
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
  if (location.kind === "trash") {
    return {
      trashOpen: true,
      settingsOpen: false,
      selectedPageId: null,
      selectedGroupId: null,
    };
  }
  if (location.kind === "settings") {
    return {
      settingsOpen: true,
      trashOpen: false,
      selectedPageId: null,
      selectedGroupId: null,
    };
  }
  if (location.kind === "project") {
    if (!state.groups.some((group) => group.id === location.id && group.deletedAt == null)) {
      return { settingsOpen: false, trashOpen: false, selectedPageId: null, selectedGroupId: null };
    }
    return {
      settingsOpen: false,
      trashOpen: false,
      selectedPageId: null,
      selectedGroupId: location.id,
    };
  }
  if (location.kind === "page") {
    const page = state.pages.find((item) => item.id === location.id && item.deletedAt == null);
    const groupLive =
      page != null &&
      state.groups.some((group) => group.id === page.groupId && group.deletedAt == null);
    if (!page || !groupLive) {
      return { settingsOpen: false, trashOpen: false, selectedPageId: null, selectedGroupId: null };
    }
    return {
      settingsOpen: false,
      trashOpen: false,
      selectedPageId: page.id,
      selectedGroupId: null,
      groups: state.groups.map((group) =>
        group.id === page.groupId && group.collapsed
          ? { ...group, collapsed: false }
          : group,
      ),
    };
  }
  return { settingsOpen: false, trashOpen: false, selectedPageId: null, selectedGroupId: null };
}

function remembered(
  state: SidebarState,
  partial: Partial<SidebarState>,
): Partial<SidebarState> {
  const next = { ...state, ...partial };
  const history = syncHistory(
    { entries: state.entries, index: state.index },
    (location) => locationAlive(location, next.groups, next.pages),
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
    (location) => locationAlive(location, next.groups, next.pages),
    actual,
  );
  return { ...partial, entries: history.entries, index: history.index };
}

export const useSidebarStore = create<SidebarState & SidebarActions>()(
  (set, get) => ({
    groups: [],
    pages: [],
    selectedPageId: null,
    selectedGroupId: null,
    settingsOpen: false,
    trashOpen: false,
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
              deletedAt: null,
            },
          ],
          selectedPageId: null,
          selectedGroupId: groupId,
          settingsOpen: false,
          trashOpen: false,
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
              ? { ...group, collapsed: false }
              : group,
          ),
          pages: [
            ...state.pages,
            { id: pageId, groupId, type, name: pageName, updatedAt: now(), deletedAt: null },
          ],
          selectedPageId: null,
          selectedGroupId: groupId,
          settingsOpen: false,
          trashOpen: false,
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
            ? { ...group, collapsed: !group.collapsed }
            : group,
        ),
      })),

    selectProject: (id) =>
      set((state) => {
        if (!state.groups.some((group) => group.id === id && group.deletedAt == null)) return {};
        return pushed(state, {
          selectedGroupId: id,
          selectedPageId: null,
          settingsOpen: false,
          trashOpen: false,
        });
      }),

    selectPage: (id) =>
      set((state) => {
        const page = state.pages.find((item) => item.id === id && item.deletedAt == null);
        const groupLive =
          page != null &&
          state.groups.some((group) => group.id === page.groupId && group.deletedAt == null);
        if (!page || !groupLive) return {};
        return pushed(state, {
          selectedPageId: id,
          selectedGroupId: null,
          settingsOpen: false,
          trashOpen: false,
          groups: state.groups.map((group) =>
            group.id === page.groupId && group.collapsed
              ? { ...group, collapsed: false }
              : group,
          ),
        });
      }),

    trashGroup: (id) =>
      set((state) => {
        const group = state.groups.find((item) => item.id === id && item.deletedAt == null);
        if (!group) return {};
        const pageIds = new Set(
          state.pages.filter((page) => page.groupId === id).map((page) => page.id),
        );
        const viewing =
          state.selectedGroupId === id ||
          (state.selectedPageId != null && pageIds.has(state.selectedPageId));
        return remembered(state, {
          groups: state.groups.map((item) =>
            item.id === id ? { ...item, deletedAt: now(), updatedAt: now() } : item,
          ),
          selectedPageId: viewing ? null : state.selectedPageId,
          selectedGroupId: viewing ? null : state.selectedGroupId,
        });
      }),

    trashPage: (id) =>
      set((state) => {
        const page = state.pages.find((item) => item.id === id && item.deletedAt == null);
        if (!page) return {};
        const groupLive = state.groups.some(
          (group) => group.id === page.groupId && group.deletedAt == null,
        );
        const viewing = state.selectedPageId === id;
        return remembered(state, {
          pages: state.pages.map((item) =>
            item.id === id ? { ...item, deletedAt: now(), updatedAt: now() } : item,
          ),
          selectedPageId: viewing ? null : state.selectedPageId,
          selectedGroupId: viewing && groupLive ? page.groupId : state.selectedGroupId,
        });
      }),

    restoreGroup: (id) =>
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === id && group.deletedAt != null
            ? { ...group, deletedAt: null, updatedAt: now() }
            : group,
        ),
        pages: state.pages.map((page) =>
          page.groupId === id && page.deletedAt != null
            ? { ...page, deletedAt: null, updatedAt: now() }
            : page,
        ),
      })),

    restorePage: (id) =>
      set((state) => ({
        pages: state.pages.map((item) =>
          item.id === id && item.deletedAt != null
            ? { ...item, deletedAt: null, updatedAt: now() }
            : item,
        ),
      })),

    purgeGroup: (id) =>
      set((state) => {
        const removed = new Set(
          state.pages.filter((page) => page.groupId === id).map((page) => page.id),
        );
        if (!state.groups.some((group) => group.id === id) && removed.size === 0) return {};
        return remembered(state, {
          groups: state.groups.filter((group) => group.id !== id),
          pages: state.pages.filter((page) => page.groupId !== id),
          selectedPageId:
            state.selectedPageId && removed.has(state.selectedPageId)
              ? null
              : state.selectedPageId,
          selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
        });
      }),

    purgePage: (id) =>
      set((state) => {
        if (!state.pages.some((page) => page.id === id)) return {};
        return remembered(state, {
          pages: state.pages.filter((page) => page.id !== id),
          selectedPageId: state.selectedPageId === id ? null : state.selectedPageId,
        });
      }),

    back: () => set((state) => step(state, -1)),

    forward: () => set((state) => step(state, 1)),

    toggleSettings: () => {
      const state = get();
      if (state.settingsOpen) {
        set((current) => {
          if (
            current.entries[current.index]?.kind === "settings" &&
            current.index > 0
          ) {
            return step(current, -1);
          }
          return remembered(current, { settingsOpen: false });
        });
        return;
      }
      useSettingsStore.getState().setSection("home");
      set((current) => pushed(current, { settingsOpen: true, trashOpen: false }));
    },

    toggleTrash: () => {
      const state = get();
      if (state.trashOpen) {
        set((current) => {
          if (current.entries[current.index]?.kind === "trash" && current.index > 0) {
            return step(current, -1);
          }
          return remembered(current, { trashOpen: false });
        });
        return;
      }
      set((current) =>
        pushed(current, {
          trashOpen: true,
          settingsOpen: false,
          selectedPageId: null,
          selectedGroupId: null,
        }),
      );
    },

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

function livePage(menu: MenuSnapshot, pageId: string | null) {
  const page = menu.pages.find((item) => item.id === pageId && item.deletedAt == null);
  return (
    page != null &&
    menu.groups.some((group) => group.id === page.groupId && group.deletedAt == null)
  );
}

function applyMenu(menu: MenuSnapshot) {
  menuExtra = menu.extra;
  useSidebarStore.setState({
    groups: menu.groups,
    pages: menu.pages,
    selectedPageId: livePage(menu, menu.selection.pageId) ? menu.selection.pageId : null,
    selectedGroupId: livePage(menu, menu.selection.pageId)
      ? null
      : menu.groups.some(
            (group) => group.id === menu.selection.groupId && group.deletedAt == null,
          )
        ? menu.selection.groupId
        : null,
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
