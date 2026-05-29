import { useTheme } from "@renderer/hooks/useTheme";
import { AppShell } from "./app/AppShell";
import { DatePickerModal } from "@renderer/features/today";
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
  const monthError = useMonthStore((s) => s.error);
  const error = view === "month" ? monthError : todoError;

  useTheme();

  return (
    <AppShell>
      {error && (
        <div className="rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === "today" && <TodayPage />}

      {view === "month" && <MonthPage />}

      {view === "settings" && <SettingsPage />}

      <DatePickerModal />
      <AddTodoModal />
    </AppShell>
  );
}
