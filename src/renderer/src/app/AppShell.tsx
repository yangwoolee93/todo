import type { ReactNode } from "react";
import { cn } from "@renderer/utils/cn";
import { APP_VERSION } from "@renderer/constants/appVersion";
import AppHeader from "./AppHeader";

interface AppShellProps {
  children: ReactNode;
}

/**
 * 앱 공통 레이아웃 — 타이틀바(브랜드 + 네비) + 콘텐츠 영역
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <AppHeader />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <footer
        className={cn(
          "flex items-center justify-between px-4 pb-2 shrink-0 border-t border-border",
          "text-xs text-fg-secondary",
        )}
      >
        <div>pre-release</div>
        <div>v{APP_VERSION}</div>
      </footer>
    </div>
  );
}
