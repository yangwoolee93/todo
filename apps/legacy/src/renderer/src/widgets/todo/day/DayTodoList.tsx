import { EmptyHint } from "@renderer/widgets/todo/month/tempMonthTimeline";
import { formatDate } from "@renderer/utils/dateUtils";
import type { DisplayTodo } from "@shared/types/todo";
import { useEffect, useState } from "react";
import DayTodoItem from "./DayTodoItem";

export default function DayTodoList({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  const [todos, setTodos] = useState<DisplayTodo[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const date = formatDate(new Date(year, month - 1, day));
    setReady(false);

    void window.api.getTodosByDate(date).then((result) => {
      if (cancelled) return;
      setTodos(result.success ? (result.data ?? []) : []);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [year, month, day]);

  return (
    <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
      >
        + 할 일 추가
      </button>
      <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!ready ? null : todos.length === 0 ? (
          <div>
            <EmptyHint>등록된 할 일이 없습니다.</EmptyHint>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <DayTodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
