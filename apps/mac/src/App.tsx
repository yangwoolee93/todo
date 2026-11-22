import {
  CaretLeftIcon,
  CaretRightIcon,
  CaretDoubleRightIcon,
  SidebarIcon,
} from "@phosphor-icons/react";
import { GlassButton } from "./components/GlassButton";
import { detailLayout } from "./features/detail/detailLayout";
import {
  DetailPanelMenuTarget,
  DetailPanelSlot,
  DetailPanelTarget,
} from "./features/detail/DetailPanelSlot";
import { DeleteConfirm } from "./features/sidebar/DeleteConfirm";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { PageScreen } from "./features/sidebar/PageScreen";
import { SelectionActions } from "./features/sidebar/SelectionActions";
import { SidebarTree } from "./features/sidebar/SidebarTree";
import { useFontSizeSync } from "./hooks/useFontSizeSync";
import { useIconScale } from "./hooks/useIconScale";
import { useThemeSync } from "./hooks/useThemeSync";
import { useDetailPanelStore } from "./stores/useDetailPanelStore";
import { useMemoStore } from "./stores/useMemoStore";
import { settingsSectionLabel, useSettingsStore } from "./stores/useSettingsStore";
import { useSidebarStore } from "./stores/useSidebarStore";
import { cn } from "./utils/cn";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function App() {
  useThemeSync();
  useFontSizeSync();
  const icon = useIconScale();
  const hydrated = useSidebarStore((state) => state.hydrated);
  const canBack = useSidebarStore((state) => state.index > 0);
  const canForward = useSidebarStore(
    (state) => state.index < state.entries.length - 1,
  );
  const groups = useSidebarStore((state) => state.groups);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const pages = useSidebarStore((state) => state.pages);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const settingsOpen = useSidebarStore((state) => state.settingsOpen);
  const section = useSettingsStore((state) => state.section);
  const setSection = useSettingsStore((state) => state.setSection);

  const back = useSidebarStore((state) => state.back);
  const forward = useSidebarStore((state) => state.forward);
  const selectProject = useSidebarStore((state) => state.selectProject);
  const detailOpen = useDetailPanelStore((state) => state.open);
  const detailWidth = useDetailPanelStore((state) => state.width);
  const closeDetail = useDetailPanelStore((state) => state.closePanel);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef(false);
  const heldShutRef = useRef(false);
  const [heldShut, setHeldShut] = useState(false);
  const [frame, setFrame] = useState({ available: 0, headerTop: 0 });
  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const pageLayout = detailLayout[selectedPage?.type ?? "memo"];
  const overlay =
    !heldShut &&
    frame.available > 0 &&
    detailWidth > frame.available - pageLayout.contentMin;
  const covered = overlay && detailWidth >= frame.available;
  const selectedGroup = groups.find((group) =>
    selectedPage
      ? group.id === selectedPage.groupId
      : group.id === selectedGroupId,
  );
  const contentTitle = settingsOpen
    ? [
        { id: "settings", name: "설정", kind: "settings" as const },
        ...(section === "home"
          ? []
          : [
              {
                id: section,
                name: settingsSectionLabel(section),
                kind: "section" as const,
              },
            ]),
      ]
    : [
        selectedGroup && {
          id: selectedGroup.id,
          name: selectedGroup.name,
          kind: "project" as const,
        },
        selectedPage && {
          id: selectedPage.id,
          name: selectedPage.name,
          kind: "page" as const,
        },
      ].filter(
        (item): item is { id: string; name: string; kind: "project" | "page" } =>
          Boolean(item?.name),
      );

  useEffect(() => {
    void (async () => {
      await useSidebarStore.getState().hydrate();
      await useMemoStore.getState().hydrate();
    })();
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeDetailOnBackground = (event: MouseEvent<HTMLDivElement>) => {
    if (!detailOpen) return;
    if (!(event.target instanceof Node)) return;
    if (!event.currentTarget.contains(event.target)) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-opens-detail]")
    ) {
      return;
    }
    closeDetail();
  };

  const readFrame = () => {
    const frameEl = frameRef.current;
    const contentEl = contentRef.current;
    const headerEl = headerRef.current;
    if (!frameEl || !contentEl || !headerEl) return null;
    const frameRect = frameEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    const headerRect = headerEl.getBoundingClientRect();
    return {
      available: Math.max(0, Math.round(frameRect.right - contentRect.left)),
      headerTop: Math.max(0, Math.round(headerRect.bottom - frameRect.top)),
    };
  };

  useLayoutEffect(() => {
    const frameEl = frameRef.current;
    const contentEl = contentRef.current;
    const headerEl = headerRef.current;
    if (!frameEl || !contentEl || !headerEl) return;
    const update = () => {
      const metrics = readFrame();
      if (!metrics || metrics.available <= 0) return;
      setFrame((current) =>
        current.available === metrics.available &&
        current.headerTop === metrics.headerTop
          ? current
          : metrics,
      );
      if (!useDetailPanelStore.getState().open || heldShutRef.current) return;
      const min = detailLayout[selectedPage?.type ?? "memo"].panelMin;
      if (metrics.available < min) {
        fillRef.current = false;
        useDetailPanelStore.getState().closePanel();
        return;
      }
      const width = useDetailPanelStore.getState().width;
      const limit =
        metrics.available -
        detailLayout[selectedPage?.type ?? "memo"].contentMin;
      if (fillRef.current || width > limit) {
        fillRef.current = true;
        useDetailPanelStore.getState().setWidth(metrics.available);
        return;
      }
      if (width > metrics.available) {
        useDetailPanelStore.getState().setWidth(metrics.available);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frameEl);
    observer.observe(contentEl);
    observer.observe(headerEl);
    return () => observer.disconnect();
  }, [detailOpen, isSidebarOpen, selectedPage?.type]);

  useEffect(() => {
    if (!detailOpen) fillRef.current = false;
  }, [detailOpen]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    let originX = event.clientX;
    let originWidth = useDetailPanelStore.getState().width;
    const min = pageLayout.panelMin;
    document.documentElement.classList.add("detail-resizing");
    let stopped = false;
    let move: (ev: PointerEvent) => void = () => {};
    const holdShut = (shut: boolean) => {
      if (heldShutRef.current === shut) return;
      heldShutRef.current = shut;
      setHeldShut(shut);
    };
    const finish = () => {
      if (stopped) return;
      stopped = true;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.documentElement.classList.remove("detail-resizing");
      if (!heldShutRef.current) return;
      heldShutRef.current = false;
      useDetailPanelStore.getState().closePanel();
      setHeldShut(false);
    };
    move = (ev: PointerEvent) => {
      const metrics = readFrame();
      if (!metrics) return;
      const max = Math.max(min, metrics.available);
      const limit = Math.max(min, max - pageLayout.contentMin);
      if (fillRef.current) {
        const pulled = ev.clientX - originX;
        if (pulled <= 24) {
          useDetailPanelStore.getState().setWidth(max);
          return;
        }
        fillRef.current = false;
        originX += 24;
        originWidth = limit;
      }
      const next = originWidth + (originX - ev.clientX);
      if (Math.round(next) < min) {
        fillRef.current = false;
        holdShut(true);
        return;
      }
      if (next > limit + 24) {
        fillRef.current = true;
        originX = ev.clientX;
        originWidth = max;
        useDetailPanelStore.getState().setWidth(max);
        holdShut(false);
        return;
      }
      useDetailPanelStore.getState().setWidth(Math.min(next, limit));
      holdShut(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  return (
    <DetailPanelSlot>
      <div
        ref={frameRef}
        className={cn(
          "bg-base/98 rounded-3xl",
          "relative flex h-full overflow-hidden",
        )}
      >
        {/* 제목막대 */}
        <div
          className={cn(
            "bg-accent/70-",
            "absolute top-0 left-0 right-0 h-11 z-0",
          )}
          data-tauri-drag-region
        ></div>
        {/* 사이드바 */}
        <div
          className={cn(
            "bg-fg/1",
            "w-60 min-h-0 flex flex-col m-2 rounded-2xl",
            "overflow-hidden",
            "glass-rim-lg",
            "pointer-events-none transition-transform duration-200 ease-out",
            isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
          )}
        >
          {hydrated && <SidebarTree onToggle={handleSidebarToggle} />}
        </div>
        {/* 컨텐츠 */}
        <div
          ref={contentRef}
          className={cn(
            "bg-red-200/50-",
            "pointer-events-none flex min-h-0 min-w-0 flex-col flex-1",
            "transition-[margin] duration-200 ease-out",
            !isSidebarOpen && "-ml-62",
          )}
        >
          {/* 컨텐츠 내 헤더(컨트롤영역) */}
          <div
            ref={headerRef}
            className={cn(
              "bg-green-200/50-",
              "pointer-events-none relative z-20 flex item-center",
              !isSidebarOpen && "pl-22",
            )}
          >
            <div
              className={cn(
                "bg-purple-200/50-",
                "pointer-events-none mt-2 flex flex-1 gap-2 items-center rounded-full",
              )}
            >
              <GlassButton
                className={cn(
                  "pointer-events-auto flex p-1.5 px-2 hover:bg-fg/10",
                  isSidebarOpen && "hidden",
                )}
                onClick={handleSidebarToggle}
              >
                <SidebarIcon aria-hidden="true" size={icon(22)} weight="light" />
              </GlassButton>
              <div className="group/history pointer-events-auto inline-flex items-center rounded-full glass-rim-sm bg-base/4 p-1">
                <button
                  type="button"
                  aria-label="뒤로"
                  data-history-step
                  disabled={!canBack}
                  className="flex rounded-full p-1 text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
                  onClick={back}
                >
                  <CaretLeftIcon aria-hidden="true" size={icon(20)} weight="light" />
                </button>
                <div className="h-4 w-px bg-fg/50 transition-opacity group-has-[[data-history-step]:hover]/history:opacity-0" />
                <button
                  type="button"
                  aria-label="앞으로"
                  data-history-step
                  disabled={!canForward}
                  className="flex rounded-full p-1 text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
                  onClick={forward}
                >
                  <CaretRightIcon aria-hidden="true" size={icon(20)} weight="light" />
                </button>
              </div>
              {/* 제목 */}
              <div className="pointer-events-none relative flex ml-2 min-w-0 items-center gap-1 text-sm font-medium">
                {hydrated &&
                  contentTitle.map((title, index) => {
                    const current = index === contentTitle.length - 1;
                    return (
                      <span
                        key={`${title.kind}-${title.id}`}
                        className="pointer-events-none flex min-w-0 items-center gap-1"
                      >
                        {index > 0 && (
                          <CaretRightIcon
                            aria-hidden="true"
                            size={icon(16)}
                            weight="light"
                            className="shrink-0 text-fg/50"
                          />
                        )}
                        {current ? (
                          <span className="pointer-events-none truncate text-fg cursor-default">
                            {title.name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pointer-events-auto min-w-0 truncate text-fg/50 hover:underline"
                            onClick={() => {
                              if (title.kind === "project") selectProject(title.id);
                              if (title.kind === "settings") setSection("home");
                            }}
                          >
                            {title.name}
                          </button>
                        )}
                      </span>
                    );
                  })}
              </div>
              {hydrated && !detailOpen && !settingsOpen && <SelectionActions />}
            </div>
          </div>
          <div
            className={cn(
              "pointer-events-auto relative flex min-h-0 flex-col overflow-hidden",
              overlay ? "flex-1 self-start" : "flex-1",
            )}
            style={overlay ? { width: pageLayout.contentMin } : undefined}
            onClick={closeDetailOnBackground}
          >
            <div className="mt-2 flex min-h-0 flex-1 flex-col">
              {hydrated && (settingsOpen ? <SettingsScreen /> : <PageScreen />)}
            </div>
          </div>
        </div>
        {heldShut && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-1 z-30 flex w-4 items-center justify-center"
          >
            <div className="h-16 w-1 rounded-full bg-fg/40" />
          </div>
        )}
        {detailOpen && !heldShut && (
          <div
            className={cn(
              "bg-base",
              "flex min-h-0 flex-col border-l border-fg/10",
              "pointer-events-none",
              covered && "absolute inset-y-0 right-0 z-30",
              !covered &&
                (overlay
                  ? "absolute right-0 bottom-0 z-10"
                  : "relative shrink-0 rounded-r-2xl"),
            )}
            style={{
              width: detailWidth,
              top: overlay && !covered ? frame.headerTop : undefined,
            }}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="패널 너비"
              aria-valuemin={pageLayout.panelMin}
              aria-valuemax={Math.max(pageLayout.panelMin, frame.available)}
              aria-valuenow={detailWidth}
              className="pointer-events-auto absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none"
              onPointerDown={startResize}
            />
            <div
              className={cn(
                "bg-green-200/50-",
                "pointer-events-none relative z-10 flex item-center px-2",
              )}
            >
              <div
                className={cn(
                  "bg-purple-200/50-",
                  "pointer-events-none mt-2 flex flex-1 gap-2 items-center justify-between rounded-full",
                )}
              >
                <GlassButton
                  aria-label="닫기"
                  className="pointer-events-auto flex p-2 hover:bg-fg/10"
                  onClick={closeDetail}
                >
                  <CaretDoubleRightIcon aria-hidden="true" size={icon(20)} />
                </GlassButton>
                <DetailPanelMenuTarget className="pointer-events-auto relative" />
              </div>
            </div>
            <DetailPanelTarget className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden" />
          </div>
        )}
        <DeleteConfirm />
      </div>
    </DetailPanelSlot>
  );
}
