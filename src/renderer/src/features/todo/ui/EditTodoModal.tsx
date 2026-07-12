import { FormEvent, useEffect, useRef, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Input, Button } from "@renderer/shared/ui";

/** TodoList ⋮ 수정 — 단건 또는 batch_id 묶음 수정 */
export function EditTodoModal() {
  const editTarget = useUIStore((s) => s.editTarget);
  const setEditTarget = useUIStore((s) => s.setEditTarget);
  const updateTodoContent = useTodoStore((s) => s.updateTodoContent);

  const open = editTarget !== null;
  const isBatch = Boolean(editTarget?.batch_id);

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setContent(editTarget?.content ?? "");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open, editTarget]);

  const handleClose = () => setEditTarget(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const success = await updateTodoContent(
        editTarget.id,
        content.replace(/[\r\n]+/g, "").trim(),
      );
      if (success) handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} label="할 일 수정">
      <ModalTitle className="mb-2 text-base font-semibold text-fg">
        내용 수정
      </ModalTitle>
      {isBatch && (
        <p className="mb-3 text-xs text-fg-secondary">
          일괄 추가된 항목입니다. 저장 시 묶음 전체가 수정됩니다.
        </p>
      )}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3"
      >
        <Input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value.replace(/[\r\n]+/g, ""))}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !content.trim()}
          >
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
