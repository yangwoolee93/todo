import { useTheme } from "@renderer/hooks/useTheme";
import { AppShell } from "@renderer/components/layout/AppShell";
import { DatePickerModal } from "@renderer/components/DatePickerModal";
import { AddTodoModal } from "@renderer/components/AddTodoModal";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { TodayPage } from "./pages/today";

/** 앱 루트 — 뷰 분기 + 공통 모달 */
export function App() {
  const view = useUIStore((s) => s.view);
  const error = useTodoStore((s) => s.error);

  useTheme();

  return (
    <AppShell>
      {error && (
        <div className="rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === "today" && <TodayPage />}

      {view === "month" && <p>월별은 준비중입니다.</p>}

      {view === "settings" && <p>설정은 준비중입니다.</p>}

      <DatePickerModal />
      <AddTodoModal />
    </AppShell>
  );
}
