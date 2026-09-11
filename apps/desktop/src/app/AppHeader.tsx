import { cn } from "@renderer/utils/cn";
import IconWin from "@renderer/assets/icon_win.png";
import IconMac from "@renderer/assets/icon_mac.png";
import { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import { Tab } from "@renderer/shared/ui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";

const AppHeader = () => {
  const view = useUIStore((s) => s.view);
  const goDesignView = useUIStore((s) => s.goDesignView);
  const goTodoView = useUIStore((s) => s.goTodoView);
  const goMemoView = useUIStore((s) => s.goMemoView);
  const goScheduleView = useUIStore((s) => s.goScheduleView);
  const goSettingsView = useUIStore((s) => s.goSettingsView);

  const tabs: { id: AppView; label: string; onClick: () => void }[] = [
    { id: "design", label: "디자인", onClick: () => goDesignView() },
    { id: "todo", label: "할일", onClick: () => goTodoView() },
    { id: "schedule", label: "일정", onClick: () => goScheduleView() },
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

    return (
      <header
        className={cn(
          "h-11 flex items-center gap-2 border-b border-border select-none",
        )}
      >
        {/* 드래그 영역 + 아이콘 */}
        <div
          className={cn("flex items-center pl-3 h-full gap-1.5")}
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <img src={IconWin} className="w-4 h-4 pointer-events-none" />
        </div>

        {/* 탭 네비게이션 */}
        <nav className={cn("flex gap-1")}>
          {tabs.map((tab) => (
            <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
              {tab.label}
            </Tab>
          ))}
        </nav>

        {/* 드래그 영역 (flex 채움) */}
        <div
          className="flex-1 h-full bg-white"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* 윈도우 컨트롤 버튼 */}
        <div className="flex items-center h-full shrink-0">
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
    return (
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between h-11",
        )}
      >
        <div
          className={cn("flex flex-1 h-full items-center gap-1.5 pl-20")}
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <img src={IconMac} className="w-6 h-6 pointer-events-none" />
          <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">
            할 일
          </span>
        </div>
        <nav className={cn("flex gap-1 pr-2")}>
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
