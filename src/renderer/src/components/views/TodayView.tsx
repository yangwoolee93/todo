import type { DisplayTodo, TodoStatus } from "@shared/types/todo";
import {
  getTodayString,
  isToday,
  shiftDate,
  toFullLabel,
} from "@renderer/utils/dateUtils";
import { TodoList } from "@renderer/components/TodoList";

/** TodayView — 오늘 탭에서 받는 props */
interface TodayViewProps {
  /** 현재 보고 있는 날짜 (YYYY-MM-DD) */
  activeDate: string;
  todos: DisplayTodo[];
  loading: boolean;
  onChangeDate: (date: string) => void;
  onOpenDatePicker: () => void;
  onOpenAddModal: () => void;
  /** ⋮ 복제 시 AddTodoModal에 넘길 내용 */
  onDuplicate: (content: string) => void;
  onToggleCompletion: (todoId: number) => Promise<boolean>;
  onSetStatus: (todoId: number, status: TodoStatus) => Promise<boolean>;
  onDelete: (todoId: number, scope: "day" | "batch") => Promise<boolean>;
  onUpdateContent: (todoId: number, content: string) => Promise<boolean>;
  onReorder: (todoId: number, direction: "up" | "down") => Promise<boolean>;
}

/**
 * 오늘 탭 메인 뷰
 * - 날짜 헤더(전날/다음날/피커) + 투두 리스트 + 하단 추가 버튼
 */
export function TodayView({
  activeDate,
  todos,
  loading,
  onChangeDate,
  onOpenDatePicker,
  onOpenAddModal,
  onDuplicate,
  onToggleCompletion,
  onSetStatus,
  onDelete,
  onUpdateContent,
  onReorder,
}: TodayViewProps) {
  const showingToday = isToday(activeDate);

  /** 선택일이 오늘이 아닐 때 오늘 날짜로 되돌림 */
  const goToday = () => onChangeDate(getTodayString());

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent cursor-default">
                {showingToday ? "오늘" : "선택한 날"}
              </span>
              {!showingToday && (
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-0.5 text-xs bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"
                  onClick={goToday}
                >
                  오늘로
                </button>
              )}
            </div>
            <h2 className="text-xl font-semibold text-fg">
              {toFullLabel(activeDate)}
            </h2>
            <p className="mt-1 text-sm text-fg-secondary">
              {todos.length}건의 할 일
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => onChangeDate(shiftDate(activeDate, -1))}
            >
              ‹ 전날
            </button>
            <button
              type="button"
              className="btn text-xs"
              onClick={onOpenDatePicker}
            >
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
          onToggleCompletion={onToggleCompletion}
          onSetStatus={onSetStatus}
          onDelete={onDelete}
          onUpdateContent={onUpdateContent}
          onReorder={onReorder}
          onDuplicate={onDuplicate}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary w-full py-3 text-sm font-medium"
        onClick={onOpenAddModal}
      >
        + 할 일 추가
      </button>
    </div>
  );
}
