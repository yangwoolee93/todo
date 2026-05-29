import { TodayHeader } from "@renderer/features/today";
import { TodoList } from "@renderer/features/todo";
import { EditTodoModal } from "@renderer/components/EditTodoModal";
import { DeleteConfirmModal } from "@renderer/components/DeleteConfirmModal";
import { DeleteBatchModal } from "@renderer/components/DeleteBatchModal";

export default function TodayWidget() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <TodayHeader />
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-4 pr-(--scrollbar-gap)">
        <div className="scrollbar scrollbar-y-inset min-h-0 flex-1">
          <TodoList />
        </div>

      </div>

      <EditTodoModal />
      <DeleteConfirmModal />
      <DeleteBatchModal />
    </div>
  );
}
