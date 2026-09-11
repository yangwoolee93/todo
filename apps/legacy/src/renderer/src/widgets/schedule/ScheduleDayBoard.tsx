import {
  TodoList,
  EditTodoModal,
  DeleteConfirmModal,
  DeleteBatchModal,
} from "@renderer/features/todo";
import { Card } from "@renderer/shared/ui";

/** 일정 — 하루 목록 */
export default function ScheduleDayBoard() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden pr-(--scrollbar-gap)">
        <div className="scrollbar scrollbar-y-inset min-h-0 flex-1 overflow-x-hidden">
          <TodoList />
        </div>
      </Card>

      <EditTodoModal />
      <DeleteConfirmModal />
      <DeleteBatchModal />
    </div>
  );
}
