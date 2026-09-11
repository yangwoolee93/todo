import { TodayHeader } from "@renderer/features/today";
import {
  TodoList,
  EditTodoModal,
  DeleteConfirmModal,
  DeleteBatchModal,
} from "@renderer/features/todo";
import { cn } from "@renderer/utils/cn";
import { Card } from "@renderer/shared/ui";

export default function TodayWidget() {
  return (
    <div className={cn("flex flex-1 flex-col gap-4 overflow-hidden")}>
      <TodayHeader />
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
