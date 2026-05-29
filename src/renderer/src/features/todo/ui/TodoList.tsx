import { useEffect } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "../model/useTodoStore";
import {
  getTodoTextClass,
  TodoStatusIcon,
} from "@renderer/components/TodoStatusIcon";
import { TodoItemMenu } from "@renderer/components/TodoItemMenu";
import type { DisplayTodo } from "@shared/types/todo";

export default function TodoList() {
  const activeDate = useUIStore((s) => s.activeDate);
  const setEditTarget = useUIStore((s) => s.setEditTarget);
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget);
  const openAddModalWithDuplicate = useUIStore((s) => s.openAddModalWithDuplicate);

  const todos = useTodoStore((s) => s.todos);
  const loading = useTodoStore((s) => s.loading);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const reorderTodo = useTodoStore((s) => s.reorderTodo);
  const toggleCompletion = useTodoStore((s) => s.toggleCompletion);
  const setTodoStatus = useTodoStore((s) => s.setTodoStatus);

  useEffect(() => {
    if (!activeDate) return;
    void loadTodosByDate(activeDate);
  }, [activeDate, loadTodosByDate]);

  const handleStatusClick = (todo: DisplayTodo) => {
    if (todo.status === "failed") return;
    void toggleCompletion(todo.id);
  };

  if (loading && todos.length === 0) {
    return <p className="text-sm text-fg-secondary">불러오는 중...</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {todos.map((todo, index) => (
        <li
          key={todo.id}
          className="flex items-center gap-2 rounded-(--radius-btn) border border-border bg-surface px-2 py-2"
        >
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="btn btn-ghost px-1.5 py-0.5 text-xs"
              disabled={index === 0}
              onClick={() => void reorderTodo(todo.id, "up")}
              aria-label="위로"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost px-1.5 py-0.5 text-xs"
              disabled={index === todos.length - 1}
              onClick={() => void reorderTodo(todo.id, "down")}
              aria-label="아래로"
            >
              ↓
            </button>
          </div>

          <button
            type="button"
            className="shrink-0 rounded p-0.5 hover:bg-muted disabled:cursor-default disabled:opacity-100"
            disabled={todo.status === "failed"}
            aria-label={
              todo.status === "completed"
                ? "완료 — 클릭하면 미완료로"
                : todo.status === "failed"
                  ? "실패"
                  : "미완료 — 클릭하면 완료로"
            }
            onClick={() => handleStatusClick(todo)}
          >
            <TodoStatusIcon status={todo.status} />
          </button>

          <button
            type="button"
            className={`min-w-0 flex-1 truncate text-left text-sm ${getTodoTextClass(todo.status)} ${
              todo.status !== "failed" ? "hover:opacity-80" : "cursor-default"
            }`}
            disabled={todo.status === "failed"}
            onClick={() => handleStatusClick(todo)}
          >
            {todo.content}
          </button>

          <TodoItemMenu
            todo={todo}
            onEdit={() => setEditTarget(todo)}
            onDuplicate={() => openAddModalWithDuplicate(todo.content)}
            onDelete={() => setDeleteTarget(todo)}
            onSetStatus={(status) => void setTodoStatus(todo.id, status)}
          />
        </li>
      ))}

      {!loading && todos.length === 0 && (
        <li className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
          등록된 투두가 없습니다.
          <br />
          <span className="text-xs">상단 「+ 할 일 추가」로 등록하세요.</span>
        </li>
      )}
    </ul>
  );
}
