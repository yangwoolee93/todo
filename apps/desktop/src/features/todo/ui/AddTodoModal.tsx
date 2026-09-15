import { FormEvent, useEffect, useRef, useState } from "react";
import {
  countDaysInRange,
  getMonthDateRange,
  getTodayString,
  toShortLabel,
  toYearMonth,
} from "@renderer/utils/dateUtils";
import { cn } from "@renderer/utils/cn";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import {
  Modal,
  ModalTitle,
  Input,
  Button,
  CloseIcon,
  ChevronRightIcon,
} from "@renderer/shared/ui";
import DateRangeCalendar from "./DateRangeCalendar";

const presetBtnClass =
  "rounded-(--radius-btn) px-2 py-1 text-xs whitespace-nowrap transition-colors";

/**
 * 할 일 추가 — 기간 필드를 누르면 달력이 열린다. 같은 날이면 하루로 저장한다.
 */
export function AddTodoModal() {
  const addModalOpen = useUIStore((s) => s.addModalOpen);
  const activeDate = useUIStore((s) => s.activeDate);
  const duplicateContent = useUIStore((s) => s.duplicateContent);
  const closeAddModal = useUIStore((s) => s.closeAddModal);

  const createTodo = useTodoStore((s) => s.createTodo);
  const createTodoRange = useTodoStore((s) => s.createTodoRange);

  const today = getTodayString();
  const thisMonth = getMonthDateRange(toYearMonth(today));

  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState(activeDate);
  const [endDate, setEndDate] = useState(activeDate);
  const [focusDate, setFocusDate] = useState(activeDate);
  const [calendarReset, setCalendarReset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const savedRangeRef = useRef({ start: activeDate, end: activeDate });

  const isSingleDay = startDate === endDate;
  const dayCount = countDaysInRange(startDate, endDate);
  const isTodayPreset = startDate === today && endDate === today;
  const isThisMonthPreset =
    startDate === thisMonth.start && endDate === thisMonth.end;

  useEffect(() => {
    if (addModalOpen && !wasOpenRef.current) {
      setContent(duplicateContent ?? "");
      setStartDate(activeDate);
      setEndDate(activeDate);
      setFocusDate(activeDate);
      setCalendarReset((n) => n + 1);
      setCalendarOpen(false);
      requestAnimationFrame(() => contentInputRef.current?.focus());
    }
    wasOpenRef.current = addModalOpen;
  }, [addModalOpen, activeDate, duplicateContent]);

  useEffect(() => {
    if (!calendarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      const { start, end } = savedRangeRef.current;
      setStartDate(start);
      setEndDate(end);
      setFocusDate(start);
      setCalendarReset((n) => n + 1);
      setCalendarOpen(false);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [calendarOpen]);

  const sanitize = (value: string) => value.replace(/[\r\n]+/g, "");

  const bumpCalendar = (start: string, end: string, focus: string) => {
    setStartDate(start);
    setEndDate(end);
    setFocusDate(focus);
    setCalendarReset((n) => n + 1);
  };

  const resetForm = () => {
    setContent("");
    bumpCalendar(activeDate, activeDate, activeDate);
    setCalendarOpen(false);
  };

  const handleClose = () => {
    resetForm();
    closeAddModal();
  };

  const confirmCalendar = () => setCalendarOpen(false);

  const cancelCalendar = () => {
    const { start, end } = savedRangeRef.current;
    bumpCalendar(start, end, start);
    setCalendarOpen(false);
  };

  const applyReset = () => {
    bumpCalendar(activeDate, activeDate, activeDate);
  };

  const applyToday = () => {
    bumpCalendar(today, today, today);
  };

  const applyThisMonth = () => {
    bumpCalendar(thisMonth.start, thisMonth.end, thisMonth.start);
  };

  const toggleCalendar = () => {
    if (calendarOpen) {
      cancelCalendar();
      return;
    }
    savedRangeRef.current = { start: startDate, end: endDate };
    setFocusDate(startDate);
    setCalendarReset((n) => n + 1);
    setCalendarOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const text = sanitize(content).trim();
      const success = isSingleDay
        ? await createTodo(text, startDate)
        : await createTodoRange({
            content: text,
            start_date: startDate,
            end_date: endDate,
          });

      if (success) handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const rangeLabel = isSingleDay
    ? toShortLabel(startDate)
    : `${toShortLabel(startDate)} ~ ${toShortLabel(endDate)}`;

  return (
    <Modal
      open={addModalOpen}
      onClose={handleClose}
      label="할 일 추가"
      size="md"
      className="overflow-visible"
    >
      {calendarOpen && (
        <div
          className="absolute inset-0 z-10 rounded-(--radius-card)"
          aria-hidden="true"
          onPointerDown={cancelCalendar}
        />
      )}

      <div className="relative z-20 mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">
          할 일 추가
        </ModalTitle>
        <Button
          variant="ghost"
          className="p-1.5"
          aria-label="닫기"
          onClick={handleClose}
        >
          <CloseIcon />
        </Button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div>
          <label
            className="mb-1 block text-xs font-medium text-fg-secondary"
            htmlFor="todo-content"
          >
            내용 (1줄)
          </label>
          <Input
            ref={contentInputRef}
            id="todo-content"
            type="text"
            value={content}
            placeholder="할 일을 입력..."
            onChange={(e) => setContent(sanitize(e.target.value))}
          />
        </div>

        <div className="relative z-20 flex flex-col gap-2">
          <label
            className="block text-xs font-medium text-fg-secondary"
            htmlFor="todo-range"
          >
            기간
          </label>
          <button
            id="todo-range"
            type="button"
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
            className={cn(
              "flex w-full items-center justify-between rounded-(--radius-btn) border bg-surface px-3 py-2 text-sm text-fg",
              "outline-none",
              calendarOpen
                ? "border-accent ring-2 ring-accent/20"
                : "border-border hover:border-accent/60",
            )}
            onClick={toggleCalendar}
          >
            <span>{rangeLabel}</span>
            <ChevronRightIcon
              className={cn(
                "text-fg-muted transition-transform",
                calendarOpen && "rotate-90",
              )}
            />
          </button>

          {calendarOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 flex gap-2 rounded-(--radius-card) border border-border bg-surface p-2 shadow-lg">
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                focusDate={focusDate}
                resetKey={calendarReset}
                className="min-w-0 flex-1"
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
              <div className="flex shrink-0 flex-col self-stretch">
                <div
                  className="flex flex-col gap-0.5 rounded-(--radius-btn) bg-muted p-1"
                  role="group"
                  aria-label="기간 빠른 선택"
                >
                  <button
                    type="button"
                    className={cn(
                      presetBtnClass,
                      "text-fg-secondary hover:text-fg",
                    )}
                    onClick={applyReset}
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    className={cn(
                      presetBtnClass,
                      isTodayPreset
                        ? "bg-surface font-medium text-fg shadow-sm"
                        : "text-fg-secondary hover:text-fg",
                    )}
                    onClick={applyToday}
                  >
                    오늘로
                  </button>
                  <button
                    type="button"
                    className={cn(
                      presetBtnClass,
                      isThisMonthPreset
                        ? "bg-surface font-medium text-fg shadow-sm"
                        : "text-fg-secondary hover:text-fg",
                    )}
                    onClick={applyThisMonth}
                  >
                    이번 달
                  </button>
                </div>
                <div className="mt-auto flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={cancelCalendar}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="px-2 py-1 text-xs"
                    onClick={confirmCalendar}
                  >
                    적용
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
          <strong className="text-fg">{dayCount}일</strong>{" "}
          {dayCount > 1 ? "동안 매일 " : " "}
          추가됩니다. ({rangeLabel})
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !content.trim()}
          >
            {submitting ? "추가 중..." : "추가"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
