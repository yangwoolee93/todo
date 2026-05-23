interface DeleteConfirmModalProps {
  open: boolean
  /** 삭제 대상 내용 미리보기 */
  preview?: string
  onClose: () => void
  onConfirm: () => void
}

/** 단독 할 일 삭제 확인 — OS confirm 대신 앱 스타일 모달 */
export function DeleteConfirmModal({
  open,
  preview,
  onClose,
  onConfirm
}: DeleteConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
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
        {preview && (
          <p className="mt-2 truncate rounded-(--radius-btn) bg-muted px-3 py-2 text-sm text-fg">
            {preview}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
