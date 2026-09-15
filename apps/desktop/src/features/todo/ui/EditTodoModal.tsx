import { FormEvent, useEffect, useRef, useState } from "react";
import {
  countDaysInRange,
  toShortLabel,
} from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Input, Button, CloseIcon } from "@renderer/shared/ui";
import TodoPeriodField from "./TodoPeriodField";

/** TodoList ⋮ 수정 — 내용과 기간을 함께 고친다. */
export function EditTodoModal() {
  const editTarget = useUIStore((s) => s.editTarget);
  const activeDate = useUIStore((s) => s.activeDate);
  const setEditTarget = useUIStore((s) => s.setEditTarget);
  const getTodoSpan = useTodoStore((s) => s.getTodoSpan);
  const updateTodo = useTodoStore((s) => s.updateTodo);

  const open = editTarget !== null;

  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState(activeDate);
  const [endDate, setEndDate] = useState(activeDate);
  const [resetStart, setResetStart] = useState(activeDate);
  const [resetEnd, setResetEnd] = useState(activeDate);
  const [spanReady, setSpanReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  const isSingleDay = startDate === endDate;
  const dayCount = countDaysInRange(startDate, endDate);

  useEffect(() => {
    if (open && !wasOpenRef.current && editTarget) {
      setContent(editTarget.content);
      setStartDate(activeDate);
      setEndDate(activeDate);
      setResetStart(activeDate);
      setResetEnd(activeDate);
      setSpanReady(false);
      requestAnimationFrame(() => inputRef.current?.focus());

      const todoId = editTarget.id;
      void getTodoSpan(todoId).then((span) => {
        if (useUIStore.getState().editTarget?.id !== todoId) return;
        if (!span) {
          setSpanReady(true);
          return;
        }
        setStartDate(span.start_date);
        setEndDate(span.end_date);
        setResetStart(span.start_date);
        setResetEnd(span.end_date);
        setSpanReady(true);
      });
    }
    wasOpenRef.current = open;
  }, [open, editTarget, activeDate, getTodoSpan]);

  const sanitize = (value: string) => value.replace(/[\r\n]+/g, "");

  const handleClose = () => setEditTarget(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const success = await updateTodo(
        editTarget.id,
        sanitize(content).trim(),
        startDate,
        endDate,
      );
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
      open={open}
      onClose={handleClose}
      label="할 일 수정"
      size="md"
      className="overflow-visible"
    >
      <div className="relative z-20 mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">할 일 수정</ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={handleClose}>
          <CloseIcon />
        </Button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label
            className="mb-1 block text-xs font-medium text-fg-secondary"
            htmlFor="todo-edit-content"
          >
            내용 (1줄)
          </label>
          <Input
            ref={inputRef}
            id="todo-edit-content"
            type="text"
            value={content}
            placeholder="할 일을 입력..."
            onChange={(e) => setContent(sanitize(e.target.value))}
          />
        </div>

        {open && spanReady && (
          <TodoPeriodField
            startDate={startDate}
            endDate={endDate}
            resetStart={resetStart}
            resetEnd={resetEnd}
            inputId="todo-edit-range"
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        )}

        <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
          <strong className="text-fg">{dayCount}일</strong>
          {dayCount > 1
            ? " 동안 매일 저장됩니다. 빠진 날은 지워지고, 늘어난 날은 미완료로 추가됩니다."
            : "로 저장됩니다."}{" "}
          ({rangeLabel})
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !content.trim() || !spanReady}
          >
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
