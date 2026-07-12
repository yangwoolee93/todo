import { CalendarBar } from "./CalendarBar";
import { useUIStore } from "@renderer/stores/useUIStore";
import { Modal, Button } from "@renderer/shared/ui";

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

  const handleSelect = (date: string) => {
    setActiveDate(date);
    closeDatePicker();
  };

  return (
    <Modal open={open} onClose={closeDatePicker} label="날짜 선택" size="lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">날짜 선택</h2>
        <Button variant="ghost" className="text-xs" onClick={closeDatePicker}>
          닫기
        </Button>
      </div>
      <CalendarBar
        activeDate={activeDate}
        onSelectDate={handleSelect}
        onChangeMonth={setActiveDateByYearMonth}
      />
    </Modal>
  );
}
