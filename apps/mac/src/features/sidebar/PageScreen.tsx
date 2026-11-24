import { useEffect, useRef, useState } from "react";
import { MemoScreen } from "../memo/MemoScreen";
import { TimelineScreen } from "../timeline/TimelineScreen";
import { pageIcons, pageTypeLabel } from "./pageTypes";
import { useDetailPanelStore } from "../../stores/useDetailPanelStore";
import { useIconScale } from "../../hooks/useIconScale";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { cn } from "../../utils/cn";

export function PageScreen() {
  const pages = useSidebarStore((state) => state.pages);
  const groups = useSidebarStore((state) => state.groups);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const selectPage = useSidebarStore((state) => state.selectPage);
  const renameGroup = useSidebarStore((state) => state.renameGroup);
  const renamePage = useSidebarStore((state) => state.renamePage);
  const icon = useIconScale();
  const page = pages.find((item) => item.id === selectedPageId && item.deletedAt == null);
  const pageGroup = groups.find(
    (group) => group.id === page?.groupId && group.deletedAt == null,
  );

  useEffect(() => {
    return () => {
      useDetailPanelStore.getState().closePanel();
    };
  }, [selectedPageId]);

  if (page && pageGroup) {
    const PageIcon = pageIcons[page.type];
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 pt-1">
        <h1
          data-opens-detail
          className="flex items-center gap-2 text-2xl font-medium text-fg"
        >
          <PageIcon
            aria-hidden="true"
            size={icon(24)}
            className="shrink-0 text-fg-secondary"
          />
          <EditableName
            name={page.name}
            label="페이지 이름"
            className="min-w-0 flex-1"
            onCommit={(next) => renamePage(page.id, next)}
          />
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {pageTypeLabel(page.type)}
        </p>
        {page.type === "memo" && <MemoScreen key={page.id} pageId={page.id} />}
        {page.type === "timeline" && (
          <TimelineScreen key={page.id} pageId={page.id} />
        )}
      </div>
    );
  }

  const group = groups.find((item) => item.id === selectedGroupId && item.deletedAt == null);
  if (!group) return null;
  const children = pages.filter((item) => item.groupId === group.id && item.deletedAt == null);

  return (
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <h1 data-opens-detail className="text-2xl font-medium text-fg">
        <EditableName
          name={group.name}
          label="프로젝트 이름"
          className="w-full"
          onCommit={(next) => renameGroup(group.id, next)}
        />
      </h1>
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
        {children.map((item) => {
          const PageIcon = pageIcons[item.type];
          return (
            <button
              key={item.id}
              type="button"
              className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-4 text-left hover:bg-fg/5"
              onClick={() => selectPage(item.id)}
            >
              <PageIcon
                aria-hidden="true"
                size={icon(16)}
                className="mt-0.5 shrink-0 text-fg-secondary"
              />
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-fg">
                  {item.name}
                </span>
                <span className="mt-1 block text-sm text-fg-secondary">
                  {pageTypeLabel(item.type)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditableName({
  name,
  label,
  className,
  onCommit,
}: {
  name: string;
  label: string;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(name);
  const cancelRef = useRef(false);

  useEffect(() => {
    setValue(name);
  }, [name]);

  const commit = (raw: string) => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setValue(name);
      return;
    }
    const next = raw.trim();
    if (!next || next === name) {
      setValue(name);
      return;
    }
    setValue(next);
    onCommit(next);
  };

  return (
    <input
      aria-label={label}
      value={value}
      className={cn(
        "bg-transparent text-2xl font-medium text-fg outline-none",
        className,
      )}
      onChange={(event) => setValue(event.target.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          cancelRef.current = true;
          setValue(name);
          event.currentTarget.blur();
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.blur();
      }}
    />
  );
}
