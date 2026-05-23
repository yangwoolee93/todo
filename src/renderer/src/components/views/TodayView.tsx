import type { DisplayTodo } from '@shared/types/todo'
import { getTodayString, isToday, shiftDate, toFullLabel } from '@renderer/utils/dateUtils'
import { TodoList } from '@renderer/components/TodoList'

interface TodayViewProps {
  activeDate: string
  todos: DisplayTodo[]
  loading: boolean
  onChangeDate: (date: string) => void
  onOpenDatePicker: () => void
  onOpenAddModal: () => void
  onToggle: (todoId: number) => Promise<boolean>
  onDelete: (todoId: number, scope: 'day' | 'batch') => Promise<boolean>
  onUpdateContent: (todoId: number, content: string) => Promise<boolean>
  onReorder: (todoId: number, direction: 'up' | 'down') => Promise<boolean>
}

/** 오늘(또는 선택 일) 집중 메인 뷰 */
export function TodayView({
  activeDate,
  todos,
  loading,
  onChangeDate,
  onOpenDatePicker,
  onOpenAddModal,
  onToggle,
  onDelete,
  onUpdateContent,
  onReorder
}: TodayViewProps) {
  const showingToday = isToday(activeDate)
  const goToday = () => onChangeDate(getTodayString())

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                {showingToday ? '오늘' : '선택한 날'}
              </span>
              {!showingToday && (
                <button type="button" className="btn btn-ghost px-2 py-0.5 text-xs" onClick={goToday}>
                  오늘로
                </button>
              )}
            </div>
            <h2 className="text-xl font-semibold text-fg">{toFullLabel(activeDate)}</h2>
            <p className="mt-1 text-sm text-fg-secondary">{todos.length}건의 투두</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => onChangeDate(shiftDate(activeDate, -1))}
            >
              ‹ 전날
            </button>
            <button type="button" className="btn text-xs" onClick={onOpenDatePicker}>
              다른 날짜
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => onChangeDate(shiftDate(activeDate, 1))}
            >
              다음날 ›
            </button>
          </div>
        </div>
      </div>

      <div className="card flex-1">
        <TodoList
          todos={todos}
          loading={loading}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdateContent={onUpdateContent}
          onReorder={onReorder}
        />
      </div>

      <button type="button" className="btn btn-primary w-full py-3 text-sm font-medium" onClick={onOpenAddModal}>
        + 투두 추가
      </button>
    </div>
  )
}
