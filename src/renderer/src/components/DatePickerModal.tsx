import { CalendarBar } from "@renderer/components/CalendarBar";
import { useUIStore } from "@renderer/stores/useUIStore";

/**
 * 다른 날짜 선택 모달 (TodayView 「다른 날짜」)
 * - CalendarBar 오버레이
 */
export function DatePickerModal() {
  const open = useUIStore((s) => s.datePickerOpen);
  const activeDate = useUIStore((s) => s.activeDate);
  const setActiveDateByYearMonth = useUIStore(
    (s) => s.setActiveDateByYearMonth,
  );
  const setActiveDate = useUIStore((s) => s.setActiveDate);
  const closeDatePicker = useUIStore((s) => s.closeDatePicker);

  if (!open) return null;

  /** 날짜 선택 후 모달을 닫는다. */
  const handleSelect = (date: string) => {
    setActiveDate(date);
    closeDatePicker();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeDatePicker}
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
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={closeDatePicker}
          >
            닫기
          </button>
        </div>
        <CalendarBar
          activeDate={activeDate}
          onSelectDate={handleSelect}
          onChangeMonth={setActiveDateByYearMonth}
        />
      </div>
    </div>
  );
}
