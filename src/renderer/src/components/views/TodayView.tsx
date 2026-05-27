import type { DisplayTodo, TodoStatus } from "@shared/types/todo";

import {
  getTodayString,
  isToday,
  shiftDate,
  toFullLabel,
} from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";

import { TodoList } from "@renderer/components/TodoList";

/** 좌측 꺾쇠 (전날) */

function ChevronLeftIcon({
  className = "h-4 w-4 shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12.5 15 7.5 10 12.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 우측 꺾쇠 (다음날) */

function ChevronRightIcon({
  className = "h-4 w-4 shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 5 12.5 10 7.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** TodayView — 오늘 탭에서 받는 props */

interface TodayViewProps {
  todos: DisplayTodo[];
  loading: boolean;
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
 * - 상단 고정: 날짜 헤더 + 할 일 추가
 * - 스크롤: 투두 목록만
 */

export function TodayView({
  todos,
  loading,
  onOpenDatePicker,
  onOpenAddModal,
  onDuplicate,
  onToggleCompletion,
  onSetStatus,
  onDelete,
  onUpdateContent,
  onReorder,
}: TodayViewProps) {
  const activeDate = useUIStore((s) => s.activeDate);
  const setActiveDate = useUIStore((s) => s.setActiveDate);

  const showingToday = isToday(activeDate);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="card shrink-0">
        <div className="flex flex-col gap-3">
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
                    onClick={() => setActiveDate(getTodayString())}
                  >
                    오늘로
                  </button>
                )}
              </div>

              <h2 className="text-xl font-semibold text-fg">
                {toFullLabel(activeDate)}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost inline-flex items-center gap-1 text-xs pl-1.5"
                aria-label="전날"
                onClick={() => setActiveDate(shiftDate(activeDate, -1))}
              >
                <ChevronLeftIcon />
                전날
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
                className="btn btn-ghost inline-flex items-center gap-1 text-xs pr-1.5"
                aria-label="다음날"
                onClick={() => setActiveDate(shiftDate(activeDate, 1))}
              >
                다음날
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-secondary">
              {todos.length}건의 할 일
            </p>

            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onOpenAddModal}
            >
              할 일 추가
            </button>
          </div>
        </div>
      </div>

      {/* <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-4 pr-[var(--scrollbar-gap)]">
        <div className="scrollbar scrollbar-y-inset min-h-0 flex-1">
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
      </div> */}
    </div>
  );
}
