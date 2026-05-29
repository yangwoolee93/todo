import { useUIStore } from '@renderer/stores/useUIStore'
import { useTodoStore } from '@renderer/features/todo/model/useTodoStore'

/** batch_id 투두 삭제 시 — 해당 날만 / 묶음 전체 선택 */
export function DeleteBatchModal() {
  const deleteTarget = useUIStore((s) => s.deleteTarget)
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)

  const open = deleteTarget !== null && Boolean(deleteTarget.batch_id)

  const handleClose = () => setDeleteTarget(null)

  const handleDeleteDay = async () => {
    if (!deleteTarget) return
    const success = await deleteTodo(deleteTarget.id, 'day')
    if (success) handleClose()
  }

  const handleDeleteAll = async () => {
    if (!deleteTarget) return
    const success = await deleteTodo(deleteTarget.id, 'batch')
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
        <p className="mb-4 text-sm text-fg-secondary">
          일괄 추가된 투두입니다. 어떻게 삭제할까요?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-danger w-full"
            onClick={() => void handleDeleteAll()}
          >
            전체 삭제
          </button>
          <button
            type="button"
            className="btn w-full"
            onClick={() => void handleDeleteDay()}
          >
            해당 날짜만 삭제
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={handleClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
