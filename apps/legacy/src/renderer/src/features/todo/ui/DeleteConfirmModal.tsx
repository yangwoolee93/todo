import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

/** 단독 할 일 삭제 확인 — batch_id 없는 경우 */
export function DeleteConfirmModal() {
  const deleteTarget = useUIStore((s) => s.deleteTarget);
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);

  const open = deleteTarget !== null && !deleteTarget.batch_id;

  const handleClose = () => setDeleteTarget(null);

  const handleConfirm = async () => {
    if (!deleteTarget) return;
    const success = await deleteTodo(deleteTarget.id, "day");
    if (success) handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} label="삭제 확인">
      <ModalTitle className="mb-2 text-base font-semibold text-fg">삭제</ModalTitle>
      <p className="text-sm text-fg-secondary">이 할 일을 삭제할까요?</p>
      {deleteTarget && (
        <p className="mt-2 truncate rounded-(--radius-btn) bg-muted px-3 py-2 text-sm text-fg">
          {deleteTarget.content}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={handleClose}>
          취소
        </Button>
        <Button variant="danger" onClick={() => void handleConfirm()}>
          삭제
        </Button>
      </div>
    </Modal>
  );
}
