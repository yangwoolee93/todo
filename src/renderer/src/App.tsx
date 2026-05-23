import { useCallback, useState } from "react";
import { AppShell } from "@renderer/components/layout/AppShell";
import { DatePickerModal } from "@renderer/components/DatePickerModal";
import { AddTodoModal } from "@renderer/components/AddTodoModal";
import { TodayView } from "@renderer/components/views/TodayView";
import { MonthBoard } from "@renderer/components/views/MonthBoard";
import { SettingsView } from "@renderer/components/views/SettingsView";
import { useTodos } from "@renderer/hooks/useTodos";
import { useTheme } from "@renderer/hooks/useTheme";
import type { AppView } from "@renderer/types/views";
import {
  buildDateString,
  getTodayString,
  toYearMonth,
} from "@renderer/utils/dateUtils";

/** 앱 루트 — 오늘 탭 상태·공통 모달·useTodos 연동 */
export function App() {
  const [view, setView] = useState<AppView>("today");
  /** 오늘 탭에서 보고 있는 날짜 */
  const [activeDate, setActiveDate] = useState(getTodayString);
  const [monthYearMonth, setMonthYearMonth] = useState(() =>
    toYearMonth(getTodayString()),
  );
  /** TodayView 「다른 날짜」→ DatePickerModal */
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  /** 하단 「+ 투두 추가」→ AddTodoModal */
  const [addModalOpen, setAddModalOpen] = useState(false);
  /** ⋮ 복제 시 AddTodoModal initialContent */
  const [duplicateContent, setDuplicateContent] = useState<
    string | undefined
  >();
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

  /** DatePickerModal에서 월 이동 시 activeDate를 해당 월 1일로 */
  const handlePickerMonthChange = (yearMonth: string) => {
    setActiveDate(buildDateString(yearMonth, 1));
  };

  /** 일반 추가 — 복제 내용 없이 모달 오픈 */
  const handleOpenAddModal = useCallback(() => {
    setDuplicateContent(undefined);
    setAddModalOpen(true);
  }, []);

  /** ⋮ 복제 — 내용만 채워 AddTodoModal 오픈 */
  const handleDuplicate = useCallback((content: string) => {
    setDuplicateContent(content);
    setAddModalOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setAddModalOpen(false);
    setDuplicateContent(undefined);
  }, []);

  return (
    <AppShell view={view} onChangeView={setView}>
      {error && (
        <div className="rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === "today" && (
        <TodayView
          activeDate={activeDate}
          todos={todos}
          loading={loading}
          onChangeDate={setActiveDate}
          onOpenDatePicker={() => setDatePickerOpen(true)}
          onOpenAddModal={handleOpenAddModal}
          onDuplicate={handleDuplicate}
          onToggleCompletion={toggleCompletion}
          onSetStatus={setTodoStatus}
          onDelete={deleteTodo}
          onUpdateContent={updateTodoContent}
          onReorder={reorderTodo}
        />
      )}

      {/* {view === 'month' && (
        <MonthBoard
          yearMonth={monthYearMonth}
          summaries={monthSummary}
          loading={loading}
          onChangeMonth={setMonthYearMonth}
        />
      )} */}

      {/* {view === 'settings' && (
        <SettingsView
          themeMode={themeMode}
          onChangeTheme={setThemeMode}
          onRefresh={refresh}
        />
      )} */}

      <DatePickerModal
        open={datePickerOpen}
        activeDate={activeDate}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={setActiveDate}
        onChangeMonth={handlePickerMonthChange}
      />

      <AddTodoModal
        open={addModalOpen}
        defaultDate={activeDate}
        initialContent={duplicateContent}
        onClose={handleCloseAddModal}
        onCreateSingle={createTodo}
        onCreateRange={createTodoRange}
        onCreateMonth={createTodoMonth}
      />
    </AppShell>
  );
}
