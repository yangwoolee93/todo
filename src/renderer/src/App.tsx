import { useState } from 'react'
import { AppShell } from '@renderer/components/layout/AppShell'
import { DatePickerModal } from '@renderer/components/DatePickerModal'
import { AddTodoModal } from '@renderer/components/AddTodoModal'
import { TodayView } from '@renderer/components/views/TodayView'
import { MonthBoard } from '@renderer/components/views/MonthBoard'
import { SettingsView } from '@renderer/components/views/SettingsView'
import { useTodos } from '@renderer/hooks/useTodos'
import { useTheme } from '@renderer/hooks/useTheme'
import type { AppView } from '@renderer/types/views'
import {
  buildDateString,
  getTodayString,
  toYearMonth
} from '@renderer/utils/dateUtils'

/** 앱 루트 */
export function App() {
  const [view, setView] = useState<AppView>('today')
  const [activeDate, setActiveDate] = useState(getTodayString)
  const [monthYearMonth, setMonthYearMonth] = useState(() => toYearMonth(getTodayString()))
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const { mode: themeMode, setMode: setThemeMode } = useTheme()

  const summaryMonth = view === 'month' ? monthYearMonth : toYearMonth(activeDate)

  const {
    todos,
    monthSummary,
    loading,
    error,
    refresh,
    createTodo,
    createTodoRange,
    createTodoMonth,
    toggleComplete,
    deleteTodo,
    updateTodoContent,
    reorderTodo
  } = useTodos({ activeDate, summaryMonth })

  const handlePickerMonthChange = (yearMonth: string) => {
    setActiveDate(buildDateString(yearMonth, 1))
  }

  return (
    <AppShell view={view} onChangeView={setView}>
      {error && (
        <div className="rounded-(--radius-btn) border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {view === 'today' && (
        <TodayView
          activeDate={activeDate}
          todos={todos}
          loading={loading}
          onChangeDate={setActiveDate}
          onOpenDatePicker={() => setDatePickerOpen(true)}
          onOpenAddModal={() => setAddModalOpen(true)}
          onToggle={toggleComplete}
          onDelete={deleteTodo}
          onUpdateContent={updateTodoContent}
          onReorder={reorderTodo}
        />
      )}

      {view === 'month' && (
        <MonthBoard
          yearMonth={monthYearMonth}
          summaries={monthSummary}
          loading={loading}
          onChangeMonth={setMonthYearMonth}
        />
      )}

      {view === 'settings' && (
        <SettingsView
          themeMode={themeMode}
          onChangeTheme={setThemeMode}
          onRefresh={refresh}
        />
      )}

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
        onClose={() => setAddModalOpen(false)}
        onCreateSingle={createTodo}
        onCreateRange={createTodoRange}
        onCreateMonth={createTodoMonth}
      />
    </AppShell>
  )
}
