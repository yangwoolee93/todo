import type { ReactNode } from "react";
import type { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import { cn } from "@renderer/utils/cn";
import { APP_VERSION } from "@renderer/constants/appVersion";

interface AppShellProps {
  children: ReactNode;
}

/**
 * 앱 공통 레이아웃 — 타이틀바(브랜드 + 네비) + 콘텐츠 영역
 */
export function AppShell({ children }: AppShellProps) {
  const view = useUIStore((s) => s.view);
  const goTodayView = useUIStore((s) => s.goTodayView);
  const goMonthView = useUIStore((s) => s.goMonthView);
  const goSettingsView = useUIStore((s) => s.goSettingsView);
  const isMac = window.electron?.platform === "darwin";

  const tabs: { id: AppView; label: string; onClick: () => void }[] = [
    { id: "today", label: "오늘", onClick: () => goTodayView() },
    { id: "month", label: "월별", onClick: () => goMonthView() },
    { id: "settings", label: "설정", onClick: () => goSettingsView() },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between h-11",
        )}
      >
        <div
          className={cn(
            "flex flex-1 h-full items-center gap-2",
            "[-webkit-app-region:drag]",
            isMac && "pl-20",
          )}
        >
          <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">
            할일
          </span>
        </div>
        <nav className={cn("flex gap-1 pr-2")}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "text-sm px-3 py-1 rounded-(--radius-btn)",
                "cursor-pointer",
                view === tab.id
                  ? "bg-accent-soft text-accent"
                  : "text-fg-secondary hover:bg-muted hover:text-fg",
              )}
              onClick={tab.onClick}
            >
              {tab.label}
            </div>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2">
          {children}
        </main>
      </div>
      <footer
        className={cn(
          "flex items-center justify-between px-4 pb-2 shrink-0",
          "text-xs text-fg-secondary",
        )}
      >
        <div>pre-release</div>
        <div>v{APP_VERSION}</div>
      </footer>
    </div>
  );
}
