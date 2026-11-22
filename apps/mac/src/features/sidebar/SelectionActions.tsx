import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { AddPageForm } from "./SidebarTree";

type Panel = "add" | "menu" | "rename" | null;

export function SelectionActions() {
  const groups = useSidebarStore((state) => state.groups);
  const pages = useSidebarStore((state) => state.pages);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const renameGroup = useSidebarStore((state) => state.renameGroup);
  const renamePage = useSidebarStore((state) => state.renamePage);
  const requestDelete = useSidebarStore((state) => state.requestDelete);
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const page = pages.find((item) => item.id === selectedPageId) ?? null;
  const project =
    page || !selectedGroupId
      ? null
      : (groups.find((group) => group.id === selectedGroupId) ?? null);
  const target = project
    ? {
        kind: "group" as const,
        id: project.id,
        name: project.name,
        label: "프로젝트 이름",
      }
    : page
      ? {
          kind: "page" as const,
          id: page.id,
          name: page.name,
          label: "페이지 이름",
        }
      : null;

  useEffect(() => {
    setPanel(null);
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

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) return;
    if (target.kind === "group") renameGroup(target.id, name);
    else renamePage(target.id, name);
    setPanel(null);
  };

  return (
    <div
      ref={rootRef}
      className="ml-auto flex items-center gap-1 mr-2 glass-rim-sm rounded-full p-1"
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
            <PlusIcon aria-hidden="true" size={20} weight="light" />
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
          aria-expanded={panel === "menu" || panel === "rename"}
          className="flex rounded-full p-1 text-fg hover:bg-fg/10"
          onClick={() => setPanel(panel === "menu" ? null : "menu")}
        >
          <DotsThreeIcon aria-hidden="true" size={20} weight="bold" />
        </button>
        {panel === "menu" && (
          <div className="menu-xs absolute top-full right-0 z-30 mt-2 flex flex-col rounded-xl border border-border bg-surface">
            <button
              type="button"
              className="rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
              onClick={() => setPanel("rename")}
            >
              이름 수정
            </button>
            <button
              type="button"
              className="rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
              onClick={() => {
                requestDelete({ kind: target.kind, id: target.id });
                setPanel(null);
              }}
            >
              삭제
            </button>
          </div>
        )}
        {panel === "rename" && (
          <form
            className="menu-sm absolute top-full right-0 z-30 mt-2 flex flex-col gap-[0.571em] rounded-2xl border border-border bg-surface"
            onSubmit={submitRename}
          >
            <input
              name="name"
              defaultValue={target.name}
              aria-label={target.label}
              autoFocus
              className="w-full rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none"
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                className="rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10"
                onClick={() => setPanel(null)}
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
              >
                저장
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
