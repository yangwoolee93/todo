import { FormEvent, useEffect, useRef, useState } from "react";
import {
  countDaysInRange,
  toShortLabel,
} from "@renderer/utils/dateUtils";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Input, Button, CloseIcon } from "@renderer/shared/ui";
import { setChildGroupOpen } from "../model/childExpanded";
import TodoPeriodField from "./TodoPeriodField";

/**
 * 할 일 추가 — 기간 필드를 누르면 달력이 열린다. 같은 날이면 하루로 저장한다.
 */
export function AddTodoModal() {
  const addModalOpen = useUIStore((s) => s.addModalOpen);
  const activeDate = useUIStore((s) => s.activeDate);
  const duplicateContent = useUIStore((s) => s.duplicateContent);
  const childParentId = useUIStore((s) => s.childParentId);
  const childGroupKey = useUIStore((s) => s.childGroupKey);
  const closeAddModal = useUIStore((s) => s.closeAddModal);

  const createTodo = useTodoStore((s) => s.createTodo);
  const createTodoRange = useTodoStore((s) => s.createTodoRange);
  const createChild = useTodoStore((s) => s.createChild);
  const getTodoSpan = useTodoStore((s) => s.getTodoSpan);

  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState(activeDate);
  const [endDate, setEndDate] = useState(activeDate);
  const [limit, setLimit] = useState<{ start: string; end: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  const childReset =
    limit && activeDate >= limit.start && activeDate <= limit.end
      ? activeDate
      : (limit?.start ?? activeDate);
  const isSingleDay = startDate === endDate;
  const dayCount = countDaysInRange(startDate, endDate);

  useEffect(() => {
    if (addModalOpen && !wasOpenRef.current) {
      setContent(duplicateContent ?? "");
      setLimit(null);
      setStartDate(activeDate);
      setEndDate(activeDate);
      if (childParentId) {
        const parentId = childParentId;
        void getTodoSpan(parentId).then((span) => {
          if (useUIStore.getState().childParentId !== parentId) return;
          if (!span) return;
          setLimit({ start: span.start_date, end: span.end_date });
          const day =
            activeDate >= span.start_date && activeDate <= span.end_date
              ? activeDate
              : span.start_date;
          setStartDate(day);
          setEndDate(day);
        });
      }
      requestAnimationFrame(() => contentInputRef.current?.focus());
    }
    wasOpenRef.current = addModalOpen;
  }, [addModalOpen, activeDate, duplicateContent, childParentId, getTodoSpan]);

  const sanitize = (value: string) => value.replace(/[\r\n]+/g, "");

  const resetForm = () => {
    setContent("");
    setStartDate(activeDate);
    setEndDate(activeDate);
  };

  const handleClose = () => {
    resetForm();
    closeAddModal();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const text = sanitize(content).trim();
      const success = childParentId
        ? await createChild({
            parent_id: childParentId,
            content: text,
            start_date: startDate,
            end_date: endDate,
          })
        : isSingleDay
          ? await createTodo(text, startDate)
          : await createTodoRange({
              content: text,
              start_date: startDate,
              end_date: endDate,
            });

      if (success) {
        if (childGroupKey) setChildGroupOpen(childGroupKey, true);
        handleClose();
      }
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
      label={childParentId ? "하위 추가" : "할 일 추가"}
      size="md"
      className="overflow-visible"
    >
      <div className="relative z-20 mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">
          {childParentId ? "하위 추가" : "할 일 추가"}
        </ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={handleClose}>
          <CloseIcon />
        </Button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
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

        {addModalOpen && (
          <TodoPeriodField
            startDate={startDate}
            endDate={endDate}
            resetStart={childParentId ? childReset : activeDate}
            resetEnd={childParentId ? childReset : activeDate}
            limit={limit}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        )}

        <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
          {childParentId ? (
            <>
              부모 기간 안에서 <strong className="text-fg">{dayCount}일</strong> 동안
              보입니다. ({rangeLabel})
            </>
          ) : (
            <>
              <strong className="text-fg">{dayCount}일</strong>{" "}
              {dayCount > 1 ? "동안 매일 " : ""}
              추가됩니다. ({rangeLabel})
            </>
          )}
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
