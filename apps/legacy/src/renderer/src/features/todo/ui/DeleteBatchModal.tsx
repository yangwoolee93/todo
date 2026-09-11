import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

/** batch_id 투두 삭제 시 — 해당 날만 / 묶음 전체 선택 */
export function DeleteBatchModal() {
  const deleteTarget = useUIStore((s) => s.deleteTarget);
  const setDeleteTarget = useUIStore((s) => s.setDeleteTarget);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);

  const open = deleteTarget !== null && Boolean(deleteTarget.batch_id);

  const handleClose = () => setDeleteTarget(null);

  const handleDeleteDay = async () => {
    if (!deleteTarget) return;
    const success = await deleteTodo(deleteTarget.id, "day");
    if (success) handleClose();
  };

  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    const success = await deleteTodo(deleteTarget.id, "batch");
    if (success) handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} label="삭제 확인">
      <ModalTitle className="mb-2 text-base font-semibold text-fg">삭제</ModalTitle>
      <p className="mb-4 text-sm text-fg-secondary">일괄 추가된 할 일입니다. 어떻게 삭제할까요?</p>
      <div className="flex flex-col gap-2">
        <Button variant="danger" className="w-full" onClick={() => void handleDeleteAll()}>
          전체 삭제
        </Button>
        <Button className="w-full" onClick={() => void handleDeleteDay()}>
          해당 날짜만 삭제
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleClose}>
          취소
        </Button>
      </div>
    </Modal>
  );
}
