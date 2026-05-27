import { useCallback, useState } from "react";
import { AppShell } from "@renderer/components/layout/AppShell";
import { DatePickerModal } from "@renderer/components/DatePickerModal";
import { AddTodoModal } from "@renderer/components/AddTodoModal";
import { TodayView } from "@renderer/components/views/TodayView";
import { MonthBoard } from "@renderer/components/views/MonthBoard";
import { SettingsView } from "@renderer/components/views/SettingsView";
import { useTodos } from "@renderer/hooks/useTodos";
import { useTheme } from "@renderer/hooks/useTheme";
import {
  buildDateString,
  getTodayString,
  toYearMonth,
} from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import { TodayPage } from "./pages/today";

/** 앱 루트 — 오늘 탭 상태·공통 모달·useTodos 연동 */
export function App() {
  const view = useUIStore((s) => s.view);
  /** 오늘 탭에서 보고 있는 날짜 */
  const activeDate = useUIStore((s) => s.activeDate);
  //
  //
  //
  const [monthYearMonth, setMonthYearMonth] = useState(() =>
    toYearMonth(getTodayString()),
  );
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  /** useTodos 월별 요약 조회 기준 (오늘 탭: activeDate의 월) */
  const summaryMonth =
    view === "month" ? monthYearMonth : toYearMonth(activeDate);

  const {
    todos,
    monthSummary,
    loading,
    error,
    refresh,
    createTodo,
    createTodoRange,
    createTodoMonth,
    toggleCompletion,
    setTodoStatus,
    deleteTodo,
    updateTodoContent,
    reorderTodo,
  } = useTodos({ activeDate, summaryMonth });

  return (
    <AppShell>
      {error && (
        <div className="rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === "today" && (
        // <TodayView
        //   todos={todos}
        //   loading={loading}
        //   onOpenDatePicker={() => setDatePickerOpen(true)}
        //   onOpenAddModal={handleOpenAddModal}
        //   onDuplicate={handleDuplicate}
        //   onToggleCompletion={toggleCompletion}
        //   onSetStatus={setTodoStatus}
        //   onDelete={deleteTodo}
        //   onUpdateContent={updateTodoContent}
        //   onReorder={reorderTodo}
        // />
        <TodayPage />
      )}

      {view === "month" && <p>월별은 준비중입니다.</p>}

      {/* {view === 'month' && (
        <MonthBoard
          yearMonth={monthYearMonth}
          summaries={monthSummary}
          loading={loading}
          onChangeMonth={setMonthYearMonth}
        />
      )} */}

      {view === "settings" && <p>설정은 준비중입니다.</p>}

      {/* {view === 'settings' && (
        <SettingsView
          themeMode={themeMode}
          onChangeTheme={setThemeMode}
          onRefresh={refresh}
        />
      )} */}

      <DatePickerModal />

      <AddTodoModal
        onCreateSingle={createTodo}
        onCreateRange={createTodoRange}
        onCreateMonth={createTodoMonth}
      />
    </AppShell>
  );
}
