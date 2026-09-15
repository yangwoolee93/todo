import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useThemeSync } from "@renderer/hooks/useThemeSync";
import { AppShell } from "./app/AppShell";
import { AddTodoModal } from "@renderer/features/todo";
import { useUIStore } from "@renderer/stores/useUIStore";

import SchedulePage from "./pages/SchedulePage";
import MemoPage from "./pages/MemoPage";
import SettingPage from "./pages/SettingPage";
import DesignPage from "./pages/DesignPage";
import TodoPage from "./pages/TodoPage";

/** 앱 루트 — 뷰 분기 + 공통 모달 */
export function App() {
  const view = useUIStore((s) => s.view);

  useThemeSync();

  // 테마 적용 후 창 표시 — visible:false 로 시작했으므로 여기서 한 번만 show()
  useEffect(() => {
    void getCurrentWindow().show();
  }, []);

  return (
    <AppShell>
      {view === "design" && <DesignPage />}

      {view === "todo" && <TodoPage />}

      {view === "settings" && <SettingPage />}

      {view === "schedule" && <SchedulePage />}

      {view === "memo" && <MemoPage />}

      <AddTodoModal />
    </AppShell>
  );
}
