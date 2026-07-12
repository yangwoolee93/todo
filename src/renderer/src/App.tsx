import { useEffect } from "react";
import { useTheme } from "@renderer/hooks/useTheme";
import { AppShell } from "./app/AppShell";
import { AddTodoModal } from "@renderer/features/todo";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import { TodayPage } from "./pages/today";
import { MonthPage } from "./pages/month";
import { SettingsPage } from "./pages/settings";

/** 앱 루트 — 뷰 분기 + 공통 모달 */
export function App() {
  const view = useUIStore((s) => s.view);
  const todoError = useTodoStore((s) => s.error);
  const clearTodoError = useTodoStore((s) => s.clearError);
  const monthError = useMonthStore((s) => s.error);
  const clearMonthError = useMonthStore((s) => s.clearError);
  const error = view === "month" ? monthError : todoError;
  const clearError = view === "month" ? clearMonthError : clearTodoError;

  useTheme();

  useEffect(() => {
    if (!error || !clearError) return;
    const timer = setTimeout(() => clearError(), 4000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  return (
    <AppShell>
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <span>{error}</span>
          {clearError && (
            <button
              type="button"
              className="shrink-0 text-xs text-danger/70 hover:text-danger"
              onClick={clearError}
              aria-label="오류 닫기"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {view === "today" && <TodayPage />}

      {view === "month" && <MonthPage />}

      {view === "settings" && <SettingsPage />}

      <AddTodoModal />
    </AppShell>
  );
}
