import { useEffect } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "../model/useTodoStore";
import { getTodoTextClass, TodoStatusIcon } from "./TodoStatusIcon";
import { TodoItemMenu } from "./TodoItemMenu";
import type { DisplayTodo } from "@shared/types/todo";
import { Button } from "@renderer/shared/ui";

function DragHandleIcon() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
      <circle cx="8" cy="14" r="1.5" />
    </svg>
  );
}

interface SortableTodoItemProps {
  todo: DisplayTodo;
  onStatusClick: (todo: DisplayTodo) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetStatus: (status: DisplayTodo["status"]) => void;
}

function SortableTodoItem({
  todo,
  onStatusClick,
  onEdit,
  onDuplicate,
  onDelete,
  onSetStatus,
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-(--radius-btn) border border-border bg-surface px-2 py-2"
    >
      <Button
        variant="ghost"
        className="shrink-0 cursor-grab px-1 py-1 text-fg-muted hover:text-fg active:cursor-grabbing"
        aria-label="순서 변경"
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </Button>

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
        onClick={() => onStatusClick(todo)}
      >
        <TodoStatusIcon status={todo.status} />
      </button>

      <button
        type="button"
        className={`min-w-0 flex-1 truncate text-left text-sm ${getTodoTextClass(todo.status)} ${
          todo.status !== "failed" ? "hover:opacity-80" : "cursor-default"
        }`}
        disabled={todo.status === "failed"}
        onClick={() => onStatusClick(todo)}
      >
        {todo.content}
      </button>

      <TodoItemMenu
        todo={todo}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onSetStatus={onSetStatus}
      />
    </li>
  );
}

export default function TodoList() {
  const activeDate = useUIStore((s) => s.activeDate);
  const setEditTarget = useUIStore((s) => s.setEditTarget);
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget);
  const openAddModalWithDuplicate = useUIStore(
    (s) => s.openAddModalWithDuplicate,
  );

  const todos = useTodoStore((s) => s.todos);
  const loading = useTodoStore((s) => s.loading);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const moveTodo = useTodoStore((s) => s.moveTodo);
  const toggleCompletion = useTodoStore((s) => s.toggleCompletion);
  const setTodoStatus = useTodoStore((s) => s.setTodoStatus);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!activeDate) return;
    void loadTodosByDate(activeDate);
  }, [activeDate, loadTodosByDate]);

  const handleStatusClick = (todo: DisplayTodo) => {
    if (todo.status === "failed") return;
    void toggleCompletion(todo.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    void moveTodo(Number(active.id), Number(over.id));
  };

  if (loading && todos.length === 0) {
    return <p className="text-sm text-fg-secondary">불러오는 중...</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-1">
          {todos.map((todo) => (
            <SortableTodoItem
              key={todo.id}
              todo={todo}
              onStatusClick={handleStatusClick}
              onEdit={() => setEditTarget(todo)}
              onDuplicate={() => openAddModalWithDuplicate(todo.content)}
              onDelete={() => setDeleteTarget(todo)}
              onSetStatus={(status) => void setTodoStatus(todo.id, status)}
            />
          ))}

          {!loading && todos.length === 0 && (
            <li className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
              등록된 할 일이 없습니다.
              <br />
              <span className="text-xs">상단 「할 일 추가」로 등록하세요.</span>
            </li>
          )}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
