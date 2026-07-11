import type { ReactNode } from "react";
import type { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import appIcon from "@renderer/assets/app-icon.svg";
import { cn } from "@renderer/utils/cn";

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
          // "bg-white",
        )}
      >
        <div
          className={cn(
            "flex flex-1 h-full items-center gap-2",
            "[-webkit-app-region:drag]",
            isMac && "pl-20",
          )}
        >
          <img src={appIcon} alt="" className="h-6 w-6 shrink-0" />
          <span className="truncate text-md font-semibold text-fg">OX</span>
        </div>
        <nav className={cn("flex gap-1 pr-1")}>
          {tabs.map((tab) => (
            <div
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
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <div className={cn("h-8 bg-gray-600")}></div>
    </div>
  );
}
