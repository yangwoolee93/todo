import { useEffect } from "react";
import { MemoScreen } from "../memo/MemoScreen";
import { pageIcons, pageTypeLabel } from "./pageTypes";
import { useDetailPanelStore } from "../../stores/useDetailPanelStore";
import { useSidebarStore } from "../../stores/useSidebarStore";

export function PageScreen() {
  const pages = useSidebarStore((state) => state.pages);
  const groups = useSidebarStore((state) => state.groups);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const selectPage = useSidebarStore((state) => state.selectPage);
  const page = pages.find((item) => item.id === selectedPageId);

  useEffect(() => {
    return () => {
      useDetailPanelStore.getState().closePanel();
    };
  }, [selectedPageId]);

  if (page) {
    const PageIcon = pageIcons[page.type];
    return (
      <div className="p-2 pt-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium text-fg">
          <PageIcon
            aria-hidden="true"
            size={24}
            className="shrink-0 text-fg-secondary"
          />
          <span className="min-w-0 truncate">{page.name}</span>
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {pageTypeLabel(page.type)}
        </p>
        {page.type === "memo" && <MemoScreen key={page.id} pageId={page.id} />}
      </div>
    );
  }

  const group = groups.find((item) => item.id === selectedGroupId);
  if (!group) return null;
  const children = pages.filter((item) => item.groupId === group.id);

  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">{group.name}</h1>
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
                size={16}
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
