import { useEffect } from "react";
import { formatDate } from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import TodoList from "@renderer/features/todo/ui/TodoList";
import { DeleteBatchModal, DeleteConfirmModal, EditTodoModal } from "@renderer/features/todo";

export default function DayTodoList({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const openAddModal = useUIStore((s) => s.openAddModal);

  // year/month/day 변경 시 스토어 activeDate 동기화
  useEffect(() => {
    setActiveDate(formatDate(new Date(year, month - 1, day)));
  }, [year, month, day, setActiveDate]);

  return (
    <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
        onClick={openAddModal}
      >
        + 할 일 추가
      </button>

      <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TodoList />
      </div>

      <EditTodoModal />
      <DeleteConfirmModal />
      <DeleteBatchModal />
    </div>
  );
}
