import {
  CaretLeftIcon,
  CaretRightIcon,
  SidebarIcon,
} from "@phosphor-icons/react";
import { GlassButton } from "./components/GlassButton";
import { DeleteConfirm } from "./features/sidebar/DeleteConfirm";
import { PageScreen } from "./features/sidebar/PageScreen";
import { SelectionActions } from "./features/sidebar/SelectionActions";
import { SidebarTree } from "./features/sidebar/SidebarTree";
import { useThemeSync } from "./hooks/useThemeSync";
import { useSidebarStore } from "./stores/useSidebarStore";
import { cn } from "./utils/cn";
import { useEffect, useState } from "react";

export function App() {
  useThemeSync();
  const hydrated = useSidebarStore((state) => state.hydrated);
  const canBack = useSidebarStore((state) => state.index > 0);
  const canForward = useSidebarStore(
    (state) => state.index < state.entries.length - 1,
  );
  const back = useSidebarStore((state) => state.back);
  const forward = useSidebarStore((state) => state.forward);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    void useSidebarStore.getState().hydrate();
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      className={cn(
        "bg-base/95 rounded-3xl",
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
          // isSidebarOpen ? "w-60" : "w-0",
          "pointer-events-none transition-transform duration-200 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        )}
      >
        {hydrated && <SidebarTree onToggle={handleSidebarToggle} />}
      </div>
      {/* 컨텐츠 */}
      <div
        className={cn(
          "bg-red-200/50-",
          "flex flex-col flex-1",
          "transition-[margin] duration-200 ease-out",
          !isSidebarOpen && "-ml-62",
        )}
      >
        {/* 컨텐츠 내 헤더(컨트롤영역) */}
        <div
          className={cn(
            "bg-green-200/50-",
            "flex item-center",
            !isSidebarOpen && "pl-22",
          )}
        >
          <div
            className={cn(
              "bg-purple-200/50-",
              "mt-2 flex flex-1 gap-2 items-center rounded-full",
            )}
          >
            <GlassButton
              className={cn(
                "flex p-1.5 px-2 hover:bg-fg/10",
                isSidebarOpen && "hidden",
              )}
              onClick={handleSidebarToggle}
            >
              <SidebarIcon aria-hidden="true" size={22} weight="light" />
            </GlassButton>
            <div className="group/history inline-flex items-center rounded-full glass-rim-sm bg-base/4 p-1">
              <button
                type="button"
                aria-label="뒤로"
                data-history-step
                disabled={!canBack}
                className="flex rounded-full p-1 text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
                onClick={back}
              >
                <CaretLeftIcon aria-hidden="true" size={20} weight="light" />
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
                <CaretRightIcon aria-hidden="true" size={20} weight="light" />
              </button>
            </div>
            {/* <button className="glass-rim-sm rounded-full p-1.5 px-2">
              ㄹㅇㄹㄴ
            </button> */}
            {hydrated && <SelectionActions />}
          </div>
        </div>
        {/* 진짜 컨텐츠 */}
        <div className={cn("bg-amber-200/50-", "flex-1 pt-2 overflow-y-auto")}>
          {hydrated && <PageScreen />}
        </div>
      </div>
      <DeleteConfirm />
    </div>
  );
}
