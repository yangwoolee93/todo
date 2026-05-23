import type { ReactNode } from "react";
import type { AppView } from "@renderer/types/views";

interface AppShellProps {
  /** 현재 활성 뷰 */
  view: AppView;
  /** 뷰 전환 핸들러 */
  onChangeView: (view: AppView) => void;
  children: ReactNode;
}

/**
 * 앱 공통 레이아웃 — 상단 네비게이션 + 콘텐츠 영역
 */
export function AppShell({ view, onChangeView, children }: AppShellProps) {
  const tabs: { id: AppView; label: string }[] = [
    { id: "today", label: "오늘" },
    { id: "month", label: "월별" },
    { id: "settings", label: "설정" },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-5">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-fg">TODO</h1>
        </div>

        <nav className="flex gap-1 rounded-[var(--radius-btn)] border border-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={view === tab.id ? "nav-tab nav-tab-active" : "nav-tab"}
              onClick={() => onChangeView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}
