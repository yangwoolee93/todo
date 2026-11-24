import { useMemoStore, type MemoItem } from "../../stores/useMemoStore";
import { useSidebarStore, type SidebarGroup, type SidebarPage } from "../../stores/useSidebarStore";
import { useTimelineStore, type TimelineTodo } from "../../stores/useTimelineStore";

export type TrashKind = "group" | "page" | "memo" | "series";

export type TrashRow = {
  kind: TrashKind;
  id: string;
  title: string;
  place: string;
  deletedAt: number;
};

export function trashRows(
  groups: SidebarGroup[],
  pages: SidebarPage[],
  memos: MemoItem[],
  todos: TimelineTodo[],
): TrashRow[] {
  const rows: TrashRow[] = [];

  for (const group of groups) {
    if (group.deletedAt == null) continue;
    rows.push({
      kind: "group",
      id: group.id,
      title: group.name,
      place: "프로젝트",
      deletedAt: group.deletedAt,
    });
  }

  for (const page of pages) {
    if (page.deletedAt == null) continue;
    const group = groups.find((item) => item.id === page.groupId);
    if (group?.deletedAt != null) continue;
    rows.push({
      kind: "page",
      id: page.id,
      title: page.name,
      place: group?.name ?? "페이지",
      deletedAt: page.deletedAt,
    });
  }

  for (const memo of memos) {
    if (memo.deletedAt == null) continue;
    const page = pages.find((item) => item.id === memo.pageId);
    const group = groups.find((item) => item.id === page?.groupId);
    if (page?.deletedAt != null || group?.deletedAt != null) continue;
    rows.push({
      kind: "memo",
      id: memo.id,
      title: memo.title.trim() || "제목 없는 메모",
      place: [group?.name, page?.name].filter(Boolean).join(" / ") || "메모",
      deletedAt: memo.deletedAt,
    });
  }

  const seen = new Set<string>();
  const trashedSeries = new Set(
    todos.filter((todo) => todo.deletedAt != null).map((todo) => todo.seriesId),
  );
  const seriesParent = new Map<string, string>();
  for (const todo of todos) {
    if (todo.parentSeriesId) seriesParent.set(todo.seriesId, todo.parentSeriesId);
  }
  for (const todo of todos) {
    if (todo.deletedAt == null || seen.has(todo.seriesId)) continue;
    seen.add(todo.seriesId);
    if (heldBySeries(todo.seriesId, seriesParent, trashedSeries)) continue;
    const page = pages.find((item) => item.id === todo.pageId);
    const group = groups.find((item) => item.id === page?.groupId);
    if (page?.deletedAt != null || group?.deletedAt != null) continue;
    rows.push({
      kind: "series",
      id: todo.seriesId,
      title: todo.title.trim() || "제목 없는 할일",
      place: [group?.name, page?.name].filter(Boolean).join(" / ") || "케이던스",
      deletedAt: todo.deletedAt,
    });
  }

  return rows.sort((a, b) => b.deletedAt - a.deletedAt || (a.title < b.title ? -1 : 1));
}

export function restoreRow(row: TrashRow) {
  if (row.kind === "group") {
    const pageIds = useSidebarStore
      .getState()
      .pages.filter((page) => page.groupId === row.id)
      .map((page) => page.id);
    useSidebarStore.getState().restoreGroup(row.id);
    useMemoStore.getState().restorePages(pageIds);
    useTimelineStore.getState().restorePages(pageIds);
  }
  if (row.kind === "page") {
    useSidebarStore.getState().restorePage(row.id);
    useMemoStore.getState().restorePages([row.id]);
    useTimelineStore.getState().restorePages([row.id]);
  }
  if (row.kind === "memo") useMemoStore.getState().restoreMemo(row.id);
  if (row.kind === "series") useTimelineStore.getState().restoreSeries(row.id);
}

function heldBySeries(seriesId: string, parentOf: Map<string, string>, trashed: Set<string>) {
  const seen = new Set<string>();
  let parent = parentOf.get(seriesId) ?? "";
  while (parent && !seen.has(parent)) {
    if (trashed.has(parent)) return true;
    seen.add(parent);
    parent = parentOf.get(parent) ?? "";
  }
  return false;
}

export function purgeRow(row: TrashRow) {
  if (row.kind === "group") useSidebarStore.getState().purgeGroup(row.id);
  if (row.kind === "page") useSidebarStore.getState().purgePage(row.id);
  if (row.kind === "memo") useMemoStore.getState().purgeMemo(row.id);
  if (row.kind === "series") useTimelineStore.getState().purgeSeries(row.id);
}

export function emptyTrash() {
  const sidebar = () => useSidebarStore.getState();
  for (const group of sidebar().groups) {
    if (group.deletedAt != null) sidebar().purgeGroup(group.id);
  }
  for (const page of sidebar().pages) {
    if (page.deletedAt != null) sidebar().purgePage(page.id);
  }
  for (const memo of useMemoStore.getState().memos) {
    if (memo.deletedAt != null) useMemoStore.getState().purgeMemo(memo.id);
  }
  const seen = new Set<string>();
  for (const todo of useTimelineStore.getState().todos) {
    if (todo.deletedAt == null || seen.has(todo.seriesId)) continue;
    seen.add(todo.seriesId);
    useTimelineStore.getState().purgeSeries(todo.seriesId);
  }
}
