import { cn } from "@renderer/utils/cn";
import IconWin from "@renderer/assets/icon_win.png";
import IconMac from "@renderer/assets/icon_mac.png";
import { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import { Tab } from "@renderer/shared/ui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState, useEffect, useCallback } from "react";

const DRAG_THRESHOLD = 4; // px — 이 이상 움직이면 창 드래그 시작

const AppHeader = () => {
  const view = useUIStore((s) => s.view);
  const goDesignView = useUIStore((s) => s.goDesignView);
  const goTodoView = useUIStore((s) => s.goTodoView);
  const goMemoView = useUIStore((s) => s.goMemoView);
  const goScheduleView = useUIStore((s) => s.goScheduleView);
  const goSettingsView = useUIStore((s) => s.goSettingsView);

  const tabs: { id: AppView; label: string; onClick: () => void }[] = [
    // { id: "design", label: "디자인", onClick: () => goDesignView() },
    { id: "todo", label: "할일", onClick: () => goTodoView() },
    // { id: "schedule", label: "일정", onClick: () => goScheduleView() },
    { id: "memo", label: "메모", onClick: () => goMemoView() },
    { id: "settings", label: "설정", onClick: () => goSettingsView() },
  ];

  const isWin = window.electron?.platform === "win32";

  const WinHeader = () => {
    const appWindow = getCurrentWindow();
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
      void appWindow.isMaximized().then(setIsMaximized);
      const unlisten = appWindow.onResized(() => {
        void appWindow.isMaximized().then(setIsMaximized);
      });
      return () => {
        void unlisten.then((f) => f());
      };
    }, [appWindow]);

    const toggleMaximize = () => {
      if (isMaximized) {
        void appWindow.unmaximize();
      } else {
        void appWindow.maximize();
      }
    };

    /** 헤더 mousedown → 일정 거리 이상 드래그 시 창 이동 */
    const handleHeaderMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const startX = e.clientX;
        const startY = e.clientY;

        const onMove = (ev: MouseEvent) => {
          const dx = Math.abs(ev.clientX - startX);
          const dy = Math.abs(ev.clientY - startY);
          if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
            cleanup();
            void appWindow.startDragging();
          }
        };

        const onUp = () => cleanup();

        const cleanup = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      },
      [appWindow],
    );

    return (
      <header
        className={cn(
          "h-11 flex items-center gap-2 border-b border-border select-none",
        )}
        onMouseDown={handleHeaderMouseDown}
      >
        {/* 아이콘 */}
        <div className="flex items-center pl-3 h-full gap-1.5">
          <img src={IconWin} className="w-4 h-4 pointer-events-none" />
        </div>

        {/* 탭 네비게이션 — 클릭은 탭 전환, 드래그는 창 이동 */}
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
              {tab.label}
            </Tab>
          ))}
        </nav>

        {/* 빈 드래그 공간 */}
        <div className="flex-1 h-full" />

        {/* 윈도우 컨트롤 — mousedown 전파 중단으로 드래그 오작동 방지 */}
        <div
          className="flex items-center h-full shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => void appWindow.minimize()}
            className={cn(
              "w-11 h-full flex items-center justify-center",
              "text-fg/60 hover:bg-white/10 hover:text-fg transition-colors",
            )}
            title="최소화"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            onClick={toggleMaximize}
            className={cn(
              "w-11 h-full flex items-center justify-center",
              "text-fg/60 hover:bg-white/10 hover:text-fg transition-colors",
            )}
            title={isMaximized ? "이전 크기로" : "최대화"}
          >
            {isMaximized ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <rect x="2.5" y="0.5" width="7" height="7" />
                <polyline points="0.5,2.5 0.5,9.5 7.5,9.5" />
              </svg>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            )}
          </button>
          <button
            onClick={() => void appWindow.close()}
            className={cn(
              "w-11 h-full flex items-center justify-center",
              "text-fg/60 hover:bg-red-500 hover:text-white transition-colors",
            )}
            title="닫기"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path
                d="M1 1l8 8M9 1l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
    );
  };

  const MacHeader = () => {
    const appWindow = getCurrentWindow();

    const handleHeaderMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const startX = e.clientX;
        const startY = e.clientY;

        const onMove = (ev: MouseEvent) => {
          const dx = Math.abs(ev.clientX - startX);
          const dy = Math.abs(ev.clientY - startY);
          if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
            cleanup();
            void appWindow.startDragging();
          }
        };

        const onUp = () => cleanup();
        const cleanup = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      },
      [appWindow],
    );

    return (
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between h-11",
        )}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex flex-1 h-full items-center gap-1.5 pl-20">
          <img src={IconMac} className="w-6 h-6 pointer-events-none" />
          <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">
            할 일
          </span>
        </div>
        <nav className="flex gap-1 pr-2">
          {tabs.map((tab) => (
            <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
              {tab.label}
            </Tab>
          ))}
        </nav>
      </header>
    );
  };

  return isWin ? <WinHeader /> : <MacHeader />;
};

export default AppHeader;
