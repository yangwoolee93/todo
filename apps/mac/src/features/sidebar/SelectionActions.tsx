import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useIconScale } from "../../hooks/useIconScale";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { TrashHoldConfirm } from "../trash/TrashHoldConfirm";
import { AddPageForm } from "./SidebarTree";

type Panel = "add" | "menu" | null;

export function SelectionActions() {
  const groups = useSidebarStore((state) => state.groups);
  const pages = useSidebarStore((state) => state.pages);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const trashGroup = useSidebarStore((state) => state.trashGroup);
  const trashPage = useSidebarStore((state) => state.trashPage);
  const [panel, setPanel] = useState<Panel>(null);
  const [confirming, setConfirming] = useState(false);
  const icon = useIconScale();
  const rootRef = useRef<HTMLDivElement>(null);

  const page = pages.find((item) => item.id === selectedPageId) ?? null;
  const project =
    page || !selectedGroupId
      ? null
      : (groups.find((group) => group.id === selectedGroupId) ?? null);
  const target = project
    ? { kind: "group" as const, id: project.id }
    : page
      ? { kind: "page" as const, id: page.id }
      : null;

  useEffect(() => {
    setPanel(null);
    setConfirming(false);
  }, [selectedGroupId, selectedPageId]);

  useEffect(() => {
    if (!panel) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [panel]);

  if (!target) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto ml-auto flex items-center gap-1 mr-2 glass-rim-sm rounded-full p-1"
    >
      {project && (
        <div className="relative">
          <button
            type="button"
            aria-label="페이지 추가"
            aria-expanded={panel === "add"}
            className="flex rounded-full p-1 text-fg hover:bg-fg/10"
            onClick={() => setPanel(panel === "add" ? null : "add")}
          >
            <PlusIcon aria-hidden="true" size={icon(20)} weight="light" />
          </button>
          {panel === "add" && (
            <div className="menu-sm absolute top-full right-0 z-30 mt-2 rounded-2xl border border-border bg-surface">
              <AddPageForm
                groupId={project.id}
                onClose={() => setPanel(null)}
              />
            </div>
          )}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          aria-label="메뉴"
          aria-expanded={panel === "menu"}
          className="flex rounded-full p-1 text-fg hover:bg-fg/10"
          onClick={() => setPanel(panel === "menu" ? null : "menu")}
        >
          <DotsThreeIcon aria-hidden="true" size={icon(20)} weight="bold" />
        </button>
        {panel === "menu" && (
          <div className="menu-xs absolute top-full right-0 z-30 mt-2 flex flex-col rounded-xl border border-border bg-surface">
            <button
              type="button"
              className="rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
              onClick={() => {
                setPanel(null);
                setConfirming(true);
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>
      {confirming && target && (
        <TrashHoldConfirm
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            if (target.kind === "group") trashGroup(target.id);
            else trashPage(target.id);
            setConfirming(false);
          }}
        />
      )}
    </div>
  );
}
