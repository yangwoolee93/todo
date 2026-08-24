import { useThemeSync } from "@renderer/hooks/useThemeSync";
import { AppShell } from "./app/AppShell";
import { AddTodoModal } from "@renderer/features/todo";
import { useUIStore } from "@renderer/stores/useUIStore";

import SchedulePage from "./pages/SchedulePage";
import MemoPage from "./pages/MemoPage";
import SettingPage from "./pages/SettingPage";
import DesignPage from "./pages/DesignPage";

/** 앱 루트 — 뷰 분기 + 공통 모달 */
export function App() {
  const view = useUIStore((s) => s.view);

  useThemeSync();

  return (
    <AppShell>
      {view === "design" && <DesignPage />}

      {view === "settings" && <SettingPage />}

      {view === "schedule" && <SchedulePage />}

      {view === "memo" && <MemoPage />}

      <AddTodoModal />
    </AppShell>
  );
}
