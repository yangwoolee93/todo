import { useEffect, useState } from "react";
import type { DisplayTodo, TodoStatus } from "@shared/types/todo";
import { DeleteBatchModal } from "@renderer/components/DeleteBatchModal";
import { DeleteConfirmModal } from "@renderer/components/DeleteConfirmModal";
import { EditTodoModal } from "@renderer/components/EditTodoModal";
import { TodoItemMenu } from "@renderer/components/TodoItemMenu";
import {
  getTodoTextClass,
  TodoStatusIcon,
} from "@renderer/components/TodoStatusIcon";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";

interface TodoListProps {
  onToggleCompletion: (todoId: number) => Promise<boolean>;
  onSetStatus: (todoId: number, status: TodoStatus) => Promise<boolean>;
  onDelete: (todoId: number, scope: "day" | "batch") => Promise<boolean>;
  onUpdateContent: (todoId: number, content: string) => Promise<boolean>;
  onReorder: (todoId: number, direction: "up" | "down") => Promise<boolean>;
  onDuplicate: (content: string) => void;
}

/**
 * 오늘 탭 일별 투두 리스트
 * - 행: ↑↓ / 상태 네모 / 텍스트 / ⋮
 * - 체크는 pending↔completed만 (failed는 ⋮에서 처리)
 */
export function TodoList({
  onToggleCompletion,
  onSetStatus,
  onDelete,
  onUpdateContent,
  onReorder,
  onDuplicate,
}: TodoListProps) {
  const todos = useTodoStore((state) => state.todos);
  const loading = useTodoStore((state) => state.loading);

  /** batch_id 있는 항목 삭제 시 범위 선택 모달 대상 */
  const [deleteTarget, setDeleteTarget] = useState<DisplayTodo | null>(null);
  /** 단독 항목 삭제 확인 모달 대상 */
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    useState<DisplayTodo | null>(null);
  /** ⋮ 수정 클릭 시 열리는 EditTodoModal 대상 */
  const [editTarget, setEditTarget] = useState<DisplayTodo | null>(null);

  /** 수정 모달 열린 동안 부모 todos가 바뀌면 initialContent 동기화 */
  useEffect(() => {
    if (!editTarget) return;
    const updated = todos.find((todo) => todo.id === editTarget.id);
    if (updated && updated.content !== editTarget.content) {
      setEditTarget(updated);
    }
  }, [todos, editTarget]);

  /** 아이콘·텍스트 클릭 — failed 상태는 토글하지 않음 */
  const handleStatusClick = (todo: DisplayTodo) => {
    if (todo.status === "failed") return;
    void onToggleCompletion(todo.id);
  };

  /** 삭제 — 묶음이면 DeleteBatchModal, 단독이면 DeleteConfirmModal */
  const handleDeleteClick = (todo: DisplayTodo) => {
    if (todo.batch_id) {
      setDeleteTarget(todo);
      return;
    }
    setConfirmDeleteTarget(todo);
  };

  /** 최초 로드 중에만 전체를 로딩 문구로 대체 (목록 있으면 유지) */
  if (loading && todos.length === 0) {
    return <p className="text-sm text-fg-secondary">불러오는 중...</p>;
  }

  return (
    <>
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
                onClick={() => void onReorder(todo.id, "up")}
                aria-label="위로"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost px-1.5 py-0.5 text-xs"
                disabled={index === todos.length - 1}
                onClick={() => void onReorder(todo.id, "down")}
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
              onDuplicate={() => onDuplicate(todo.content)}
              onDelete={() => handleDeleteClick(todo)}
              onSetStatus={(status) => void onSetStatus(todo.id, status)}
            />
          </li>
        ))}
        {todos.length === 0 && (
          <li className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
            등록된 투두가 없습니다.
            <br />
            <span className="text-xs">상단 「+ 할 일 추가」로 등록하세요.</span>
          </li>
        )}
      </ul>

      <DeleteBatchModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onDeleteDay={() => {
          if (!deleteTarget) return;
          void onDelete(deleteTarget.id, "day").then(() =>
            setDeleteTarget(null),
          );
        }}
        onDeleteAll={() => {
          if (!deleteTarget) return;
          void onDelete(deleteTarget.id, "batch").then(() =>
            setDeleteTarget(null),
          );
        }}
      />

      <DeleteConfirmModal
        open={confirmDeleteTarget !== null}
        preview={confirmDeleteTarget?.content}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={() => {
          if (!confirmDeleteTarget) return;
          void onDelete(confirmDeleteTarget.id, "day").then(() =>
            setConfirmDeleteTarget(null),
          );
        }}
      />

      <EditTodoModal
        open={editTarget !== null}
        initialContent={editTarget?.content ?? ""}
        isBatch={Boolean(editTarget?.batch_id)}
        onClose={() => setEditTarget(null)}
        onSave={async (content) => {
          if (!editTarget) return false;
          return onUpdateContent(editTarget.id, content);
        }}
      />
    </>
  );
}
