import { FormEvent, useEffect, useRef, useState } from "react";
import type {
  CreateTodoMonthPayload,
  CreateTodoRangePayload,
} from "@shared/types/todo";
import {
  countDaysInRange,
  getMonthDateRange,
  toShortLabel,
  toYearMonth,
} from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";

/** 모달 닫기 X 아이콘 */
function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5 15 15M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 추가 모달 탭 — 하루 / 기간 / 한 달 */
type AddMode = "single" | "range" | "month";

interface AddTodoModalProps {
  onCreateSingle: (content: string, targetDate: string) => Promise<boolean>;
  onCreateRange: (payload: CreateTodoRangePayload) => Promise<boolean>;
  onCreateMonth: (payload: CreateTodoMonthPayload) => Promise<boolean>;
}

/**
 * 투두 추가 모달 (오늘 탭 하단 「+ 투두 추가」 / ⋮ 복제)
 * - 하루·기간·한 달 탭
 */
export function AddTodoModal({
  onCreateSingle,
  onCreateRange,
  onCreateMonth,
}: AddTodoModalProps) {
  const addModalOpen = useUIStore((s) => s.addModalOpen);
  const activeDate = useUIStore((s) => s.activeDate);
  const duplicateContent = useUIStore((s) => s.duplicateContent);
  const closeAddModal = useUIStore((s) => s.closeAddModal);

  //
  //
  const [mode, setMode] = useState<AddMode>("single");
  const [content, setContent] = useState("");
  const [targetDate, setTargetDate] = useState(activeDate);
  const [startDate, setStartDate] = useState(activeDate);
  const [endDate, setEndDate] = useState(activeDate);
  const [yearMonth, setYearMonth] = useState(() => toYearMonth(activeDate));
  const [submitting, setSubmitting] = useState(false);
  const contentInputRef = useRef<HTMLInputElement>(null);
  /** false→true 전환 시에만 폼 초기화 (열린 채 defaultDate 변경 시 입력 유지) */
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (addModalOpen && !wasOpenRef.current) {
      setContent(duplicateContent ?? "");
      setMode("single");
      setTargetDate(activeDate);
      setStartDate(activeDate);
      setEndDate(activeDate);
      setYearMonth(toYearMonth(activeDate));
      requestAnimationFrame(() => contentInputRef.current?.focus());
    }
    wasOpenRef.current = addModalOpen;
  }, [addModalOpen, activeDate, duplicateContent]);

  /** 줄바꿈 제거 — 1줄 입력만 허용 */
  const sanitize = (value: string) => value.replace(/[\r\n]+/g, "");

  const handleClose = () => {
    setContent("");
    setMode("single");
    closeAddModal();
  };

  /** 탭별 create IPC 호출 */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      let success = false;

      if (mode === "single") {
        success = await onCreateSingle(content, targetDate);
      } else if (mode === "range") {
        success = await onCreateRange({
          content,
          start_date: startDate,
          end_date: endDate,
        });
      } else {
        success = await onCreateMonth({ content, year_month: yearMonth });
      }

      if (success) handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const rangeDayCount =
    startDate && endDate && startDate <= endDate
      ? countDaysInRange(startDate, endDate)
      : 0;

  const monthRange = getMonthDateRange(yearMonth);
  const monthDayCount = countDaysInRange(monthRange.start, monthRange.end);

  if (!addModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="할 일 추가"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">할 일 추가</h2>
          <button
            type="button"
            className="btn btn-ghost p-1.5"
            aria-label="닫기"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-(--radius-btn) border border-border bg-muted p-1">
          <button
            type="button"
            className={
              mode === "single"
                ? "nav-tab nav-tab-active flex-1"
                : "nav-tab flex-1"
            }
            onClick={() => setMode("single")}
          >
            하루
          </button>
          <button
            type="button"
            className={
              mode === "range"
                ? "nav-tab nav-tab-active flex-1"
                : "nav-tab flex-1"
            }
            onClick={() => setMode("range")}
          >
            기간
          </button>
          <button
            type="button"
            className={
              mode === "month"
                ? "nav-tab nav-tab-active flex-1"
                : "nav-tab flex-1"
            }
            onClick={() => setMode("month")}
          >
            한 달
          </button>
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
            <input
              ref={contentInputRef}
              id="todo-content"
              type="text"
              className="input"
              value={content}
              placeholder="할 일을 입력..."
              onChange={(e) => setContent(sanitize(e.target.value))}
            />
          </div>

          {mode === "single" && (
            <div>
              <label
                className="mb-1 block text-xs font-medium text-fg-secondary"
                htmlFor="todo-date"
              >
                날짜
              </label>
              <input
                id="todo-date"
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          )}

          {mode === "range" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-fg-secondary"
                    htmlFor="range-start"
                  >
                    시작일
                  </label>
                  <input
                    id="range-start"
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-fg-secondary"
                    htmlFor="range-end"
                  >
                    종료일
                  </label>
                  <input
                    id="range-end"
                    type="date"
                    className="input"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {rangeDayCount > 0 && startDate <= endDate && (
                <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
                  <strong className="text-fg">{rangeDayCount}일</strong> 동안
                  매일 추가됩니다. ({toShortLabel(startDate)} ~{" "}
                  {toShortLabel(endDate)})
                </p>
              )}
              {startDate > endDate && (
                <p className="text-xs text-danger">
                  시작일은 종료일보다 늦을 수 없습니다.
                </p>
              )}
            </>
          )}

          {mode === "month" && (
            <>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-fg-secondary"
                  htmlFor="todo-month"
                >
                  대상 월
                </label>
                <input
                  id="todo-month"
                  type="month"
                  className="input"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                />
              </div>
              <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
                <strong className="text-fg">{yearMonth}</strong> —{" "}
                {monthDayCount}일(1일~말일) 매일 추가됩니다.
              </p>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                submitting ||
                !content.trim() ||
                (mode === "range" && startDate > endDate)
              }
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
