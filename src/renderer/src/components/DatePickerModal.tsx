import { CalendarBar } from '@renderer/components/CalendarBar'

interface DatePickerModalProps {
  /** 모달 표시 여부 */
  open: boolean
  /** 현재 선택 날짜 */
  activeDate: string
  /** 모달 닫기 */
  onClose: () => void
  /** 날짜 선택 시 */
  onSelectDate: (date: string) => void
  /** 월 변경 시 */
  onChangeMonth: (yearMonth: string) => void
}

/**
 * 다른 날짜 선택 모달 (TodayView 「다른 날짜」)
 * - CalendarBar 오버레이
 */
export function DatePickerModal({
  open,
  activeDate,
  onClose,
  onSelectDate,
  onChangeMonth
}: DatePickerModalProps) {
  if (!open) return null

  /** 날짜 선택 후 모달을 닫는다. */
  const handleSelect = (date: string) => {
    onSelectDate(date)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="날짜 선택"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">날짜 선택</h2>
          <button type="button" className="btn btn-ghost text-xs" onClick={onClose}>
            닫기
          </button>
        </div>
        <CalendarBar
          activeDate={activeDate}
          onSelectDate={handleSelect}
          onChangeMonth={onChangeMonth}
        />
      </div>
    </div>
  )
}
