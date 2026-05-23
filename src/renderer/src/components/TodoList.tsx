import { useState } from 'react'
import type { DisplayTodo } from '@shared/types/todo'
import { DeleteBatchModal } from '@renderer/components/DeleteBatchModal'
import { EditTodoModal } from '@renderer/components/EditTodoModal'

interface TodoListProps {
  todos: DisplayTodo[]
  loading: boolean
  onToggle: (todoId: number) => Promise<boolean>
  onDelete: (todoId: number, scope: 'day' | 'batch') => Promise<boolean>
  onUpdateContent: (todoId: number, content: string) => Promise<boolean>
  onReorder: (todoId: number, direction: 'up' | 'down') => Promise<boolean>
}

/**
 * 일별 투두 리스트 — 체크·수정·삭제·순서 변경
 */
export function TodoList({
  todos,
  loading,
  onToggle,
  onDelete,
  onUpdateContent,
  onReorder
}: TodoListProps) {
  const [deleteTarget, setDeleteTarget] = useState<DisplayTodo | null>(null)
  const [editTarget, setEditTarget] = useState<DisplayTodo | null>(null)

  /** 삭제 버튼 — 묶음이면 확인 모달 */
  const handleDeleteClick = (todo: DisplayTodo) => {
    if (todo.batch_id) {
      setDeleteTarget(todo)
      return
    }
    if (confirm('이 투두를 삭제할까요?')) {
      void onDelete(todo.id, 'day')
    }
  }

  if (loading) {
    return <p className="text-sm text-fg-secondary">불러오는 중...</p>
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
                onClick={() => void onReorder(todo.id, 'up')}
                aria-label="위로"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost px-1.5 py-0.5 text-xs"
                disabled={index === todos.length - 1}
                onClick={() => void onReorder(todo.id, 'down')}
                aria-label="아래로"
              >
                ↓
              </button>
            </div>

            <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-accent"
                checked={todo.is_completed}
                onChange={() => void onToggle(todo.id)}
              />
              <span className={todo.is_completed ? 'text-fg-muted line-through' : 'text-fg'}>
                {todo.content}
              </span>
            </label>

            <button
              type="button"
              className="btn btn-ghost shrink-0 text-xs"
              onClick={() => setEditTarget(todo)}
            >
              수정
            </button>
            <button
              type="button"
              className="btn btn-danger shrink-0 text-xs"
              onClick={() => handleDeleteClick(todo)}
            >
              삭제
            </button>
          </li>
        ))}
        {todos.length === 0 && (
          <li className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
            등록된 투두가 없습니다.
            <br />
            <span className="text-xs">아래 「투두 추가」 버튼으로 등록하세요.</span>
          </li>
        )}
      </ul>

      <DeleteBatchModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onDeleteDay={() => {
          if (!deleteTarget) return
          void onDelete(deleteTarget.id, 'day').then(() => setDeleteTarget(null))
        }}
        onDeleteAll={() => {
          if (!deleteTarget) return
          void onDelete(deleteTarget.id, 'batch').then(() => setDeleteTarget(null))
        }}
      />

      <EditTodoModal
        open={editTarget !== null}
        initialContent={editTarget?.content ?? ''}
        isBatch={Boolean(editTarget?.batch_id)}
        onClose={() => setEditTarget(null)}
        onSave={async (content) => {
          if (!editTarget) return false
          return onUpdateContent(editTarget.id, content)
        }}
      />
    </>
  )
}
