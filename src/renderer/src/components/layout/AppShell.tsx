import type { ReactNode } from "react";
import type { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";

interface AppShellProps {
  children: ReactNode;
}

/**
 * 앱 공통 레이아웃 — 상단 네비게이션 + 콘텐츠 영역
 */
export function AppShell({ children }: AppShellProps) {
  const tabs: { id: AppView; label: string }[] = [
    { id: "today", label: "오늘" },
    { id: "month", label: "월별" },
    { id: "settings", label: "설정" },
  ];

  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col overflow-hidden px-4 py-5">
      <header className="mb-5 flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-fg">TODO</h1>
        </div>

        <nav className="flex gap-1 rounded-[var(--radius-btn)] border border-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={view === tab.id ? "nav-tab nav-tab-active" : "nav-tab"}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
