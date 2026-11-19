import { invoke } from "@tauri-apps/api/core";
import { pageTypes, type PageTypeId } from "./pageTypes";

type MenuGroup = {
  id: string;
  name: string;
  collapsed: boolean;
  updatedAt: number;
};

type MenuPage = {
  id: string;
  groupId: string;
  type: PageTypeId;
  name: string;
  updatedAt: number;
};

export type MenuSelection = {
  pageId: string | null;
  groupId: string | null;
};

export type MenuSnapshot = {
  groups: MenuGroup[];
  pages: MenuPage[];
  selection: MenuSelection;
  extra: Record<string, unknown>;
};

const pageTypeIds = new Set<string>(pageTypes.map((type) => type.id));

export function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function parseMenu(value: unknown): MenuSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const groups = parseGroups(raw.groups);
  const groupIds = new Set(groups.map((group) => group.id));
  const pages = parsePages(raw.pages).filter((page) => groupIds.has(page.groupId));
  const pageIds = new Set(pages.map((page) => page.id));
  const selection = parseSelection(raw.selection);
  let pageId = selection.pageId && pageIds.has(selection.pageId) ? selection.pageId : null;
  let groupId =
    selection.groupId && groupIds.has(selection.groupId) ? selection.groupId : null;

  if (pageId) {
    const page = pages.find((item) => item.id === pageId);
    groupId = null;
    if (page) {
      const index = groups.findIndex((group) => group.id === page.groupId);
      if (index >= 0) groups[index] = { ...groups[index], collapsed: false };
    }
  }

  const extra = { ...raw };
  delete extra.groups;
  delete extra.pages;
  delete extra.selection;
  return { groups, pages, selection: { pageId, groupId }, extra };
}

export function menuPayload(snapshot: MenuSnapshot) {
  return {
    ...snapshot.extra,
    groups: snapshot.groups,
    pages: snapshot.pages,
    selection: snapshot.selection,
  };
}

export async function loadMenu(): Promise<MenuSnapshot | null> {
  if (!inTauri()) return null;
  try {
    return parseMenu(await invoke("load_menu"));
  } catch {
    return null;
  }
}

export async function saveMenu(snapshot: MenuSnapshot) {
  if (!inTauri()) return;
  await invoke("save_menu", { menu: menuPayload(snapshot) });
}

function parseGroups(value: unknown): MenuGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: MenuGroup[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const group = item as Record<string, unknown>;
    const id = text(group.id);
    const name = text(group.name);
    if (!id || !name || groups.some((saved) => saved.id === id)) continue;
    groups.push({
      id,
      name,
      collapsed: group.collapsed === true,
      updatedAt: time(group.updatedAt),
    });
  }
  return groups;
}

function parsePages(value: unknown): MenuPage[] {
  if (!Array.isArray(value)) return [];
  const pages: MenuPage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const page = item as Record<string, unknown>;
    const id = text(page.id);
    const groupId = text(page.groupId);
    const name = text(page.name);
    const type = text(page.type);
    if (!id || !groupId || !name || !type || !pageTypeIds.has(type)) continue;
    if (pages.some((saved) => saved.id === id)) continue;
    pages.push({
      id,
      groupId,
      type: type as PageTypeId,
      name,
      updatedAt: time(page.updatedAt),
    });
  }
  return pages;
}

function parseSelection(value: unknown): MenuSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { pageId: null, groupId: null };
  }
  const selection = value as Record<string, unknown>;
  return { pageId: text(selection.pageId), groupId: text(selection.groupId) };
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function time(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
