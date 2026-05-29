import { useUIStore } from '@renderer/stores/useUIStore'
import { useTodoStore } from '@renderer/features/todo/model/useTodoStore'

/** 단독 할 일 삭제 확인 — batch_id 없는 경우 */
export function DeleteConfirmModal() {
  const deleteTarget = useUIStore((s) => s.deleteTarget)
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)

  const open = deleteTarget !== null && !deleteTarget.batch_id

  const handleClose = () => setDeleteTarget(null)

  const handleConfirm = async () => {
    if (!deleteTarget) return
    const success = await deleteTodo(deleteTarget.id, 'day')
    if (success) handleClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="삭제 확인"
      >
        <h2 className="mb-2 text-base font-semibold text-fg">삭제</h2>
        <p className="text-sm text-fg-secondary">이 할 일을 삭제할까요?</p>
        {deleteTarget && (
          <p className="mt-2 truncate rounded-(--radius-btn) bg-muted px-3 py-2 text-sm text-fg">
            {deleteTarget.content}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void handleConfirm()}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
