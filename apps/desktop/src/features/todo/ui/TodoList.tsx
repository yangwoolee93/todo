import { useEffect, useState } from "react";
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
import { Button, ChevronRightIcon, DragHandleIcon } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";
import { isChildGroupOpen, setChildGroupOpen } from "../model/childExpanded";

interface SortableTodoItemProps {
  todo: DisplayTodo;
  onStatusClick: (todo: DisplayTodo) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeleteChildren?: () => void;
  onAddChild?: () => void;
  showAddChild?: boolean;
  fold?: { open: boolean; onToggle: () => void };
  onSetStatus: (status: DisplayTodo["status"]) => void;
}

function SortableTodoItem({
  todo,
  onStatusClick,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteChildren,
  onAddChild,
  showAddChild,
  fold,
  onSetStatus,
}: SortableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });

  const style = {
    transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined,
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

      {fold ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-fg-secondary hover:bg-muted hover:text-fg"
          aria-label={fold.open ? "하위 접기" : "하위 펼치기"}
          aria-expanded={fold.open}
          onClick={fold.onToggle}
        >
          <ChevronRightIcon
            className={cn("h-4 w-4 transition-transform", fold.open && "rotate-90")}
          />
        </button>
      ) : null}

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
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm",
          getTodoTextClass(todo.status),
          todo.status !== "failed" ? "hover:opacity-80" : "cursor-default",
        )}
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
        onDeleteChildren={onDeleteChildren}
        onAddChild={onAddChild}
        showAddChild={showAddChild}
        onSetStatus={onSetStatus}
      />
    </li>
  );
}

export default function TodoList() {
  const activeDate = useUIStore((s) => s.activeDate);
  const setEditTarget = useUIStore((s) => s.setEditTarget);
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget);
  const openAddModalWithDuplicate = useUIStore((s) => s.openAddModalWithDuplicate);
  const openAddChild = useUIStore((s) => s.openAddChild);
  const setDeleteChildrenTarget = useUIStore((s) => s.setDeleteChildrenTarget);
  const [foldTick, setFoldTick] = useState(0);

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
    const from = todos.find((todo) => todo.id === active.id);
    const to = todos.find((todo) => todo.id === over.id);
    if (!from || !to) return;
    if ((from.parent_id ?? null) !== (to.parent_id ?? null)) return;

    void moveTodo(String(active.id), String(over.id));
  };

  const roots = [...todos.filter((todo) => !todo.parent_id)].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at - b.created_at;
  });
  const childrenOf = (groupKey: string) =>
    [...todos.filter((todo) => todo.parent_id === groupKey)].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at - b.created_at;
    });

  if (loading && todos.length === 0) {
    return <p className="text-sm text-fg-secondary">불러오는 중...</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3">
          {roots.map((todo) => {
            const children = childrenOf(todo.group_key);
            const open = foldTick >= 0 && isChildGroupOpen(todo.group_key);
            return (
              <li key={todo.id} className="flex flex-col gap-1">
                <ul className="flex flex-col gap-1">
                  <SortableTodoItem
                    todo={todo}
                    onStatusClick={handleStatusClick}
                    onEdit={() => setEditTarget(todo)}
                    onDuplicate={() => openAddModalWithDuplicate(todo.content)}
                    onDelete={() => setDeleteTarget(todo)}
                    onDeleteChildren={() => setDeleteChildrenTarget(todo)}
                    onAddChild={() => openAddChild(todo.id, todo.group_key)}
                    showAddChild={!todo.parent_id && children.length === 0}
                    onSetStatus={(status) => void setTodoStatus(todo.id, status)}
                    fold={
                      children.length > 0
                        ? {
                            open,
                            onToggle: () => {
                              setChildGroupOpen(todo.group_key, !open);
                              setFoldTick((n) => n + 1);
                            },
                          }
                        : undefined
                    }
                  />
                </ul>
                {children.length > 0 && open && (
                  <div className="ml-6 flex flex-col gap-1 border-l border-border pl-2">
                    <button
                      type="button"
                      className="w-full rounded-(--radius-btn) bg-surface px-3 py-2 text-left text-xs text-fg-secondary hover:bg-muted hover:text-fg"
                      onClick={() => openAddChild(todo.id, todo.group_key)}
                    >
                      + 하위 추가
                    </button>
                    <ul className="flex flex-col gap-1">
                      {children.map((child) => (
                        <SortableTodoItem
                          key={child.id}
                          todo={child}
                          onStatusClick={handleStatusClick}
                          onEdit={() => setEditTarget(child)}
                          onDuplicate={() => openAddModalWithDuplicate(child.content)}
                          onDelete={() => setDeleteTarget(child)}
                          showAddChild={false}
                          onSetStatus={(status) => void setTodoStatus(child.id, status)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}

          {!loading && roots.length === 0 && (
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
