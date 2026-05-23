import { FormEvent, useEffect, useState } from 'react'

interface EditTodoModalProps {
  open: boolean
  initialContent: string
  isBatch: boolean
  onClose: () => void
  onSave: (content: string) => Promise<boolean>
}

/** 투두 내용 수정 모달 — batch_id 있으면 묶음 전체 수정 */
export function EditTodoModal({
  open,
  initialContent,
  isBatch,
  onClose,
  onSave
}: EditTodoModalProps) {
  const [content, setContent] = useState(initialContent)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setContent(initialContent)
  }, [open, initialContent])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const success = await onSave(content.replace(/[\r\n]+/g, '').trim())
      if (success) onClose()
    } finally {
      setSubmitting(false)
    }
  }

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
        aria-label="투두 수정"
      >
        <h2 className="mb-2 text-base font-semibold text-fg">내용 수정</h2>
        {isBatch && (
          <p className="mb-3 text-xs text-fg-secondary">
            일괄 추가된 항목입니다. 저장 시 묶음 전체가 수정됩니다.
          </p>
        )}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <input
            type="text"
            className="input"
            value={content}
            autoFocus
            onChange={(e) => setContent(e.target.value.replace(/[\r\n]+/g, ''))}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !content.trim()}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
