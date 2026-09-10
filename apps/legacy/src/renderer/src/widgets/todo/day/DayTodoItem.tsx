import { TodoItemMenu, TodoStatusIcon } from "@renderer/features/todo";
import { Button, DragHandleIcon } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";
import type { DisplayTodo } from "@shared/types/todo";

export default function DayTodoItem({ todo }: { todo: DisplayTodo }) {
  return (
    <li className="group flex items-center gap-2 rounded-(--radius-card) bg-surface px-3 py-3">
      <Button
        variant="ghost"
        className="shrink-0 cursor-grab px-1 py-1 text-fg-muted opacity-30 hover:text-fg group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="순서 변경"
      >
        <DragHandleIcon />
      </Button>
      <span className="shrink-0 p-0.5">
        <TodoStatusIcon status={todo.status} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-left font-medium leading-snug line-clamp-2",
          todo.status === "pending" ? "text-fg" : "text-fg-muted",
          todo.status === "failed" && "line-through",
        )}
      >
        {todo.content}
      </span>
      <div className="opacity-30 group-hover:opacity-100 group-focus-within:opacity-100">
        <TodoItemMenu
          todo={todo}
          onEdit={() => undefined}
          onDuplicate={() => undefined}
          onDelete={() => undefined}
          onSetStatus={() => undefined}
        />
      </div>
    </li>
  );
}
