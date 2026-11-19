import { NotepadIcon, PathIcon, type Icon } from "@phosphor-icons/react";

export const pageTypes = [
  { id: "timeline", label: "타임라인" },
  { id: "memo", label: "메모" },
] as const;

export type PageTypeId = (typeof pageTypes)[number]["id"];

export const pageIcons: Record<PageTypeId, Icon> = {
  timeline: PathIcon,
  memo: NotepadIcon,
};

export function pageTypeLabel(type: PageTypeId) {
  return pageTypes.find((item) => item.id === type)?.label ?? "";
}
