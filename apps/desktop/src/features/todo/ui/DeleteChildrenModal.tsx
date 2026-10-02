import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

/** 부모는 그대로 두고 하위만 모두 지운다. */
export function DeleteChildrenModal() {
  const target = useUIStore((s) => s.deleteChildrenTarget);
  const setTarget = useUIStore((s) => s.setDeleteChildrenTarget);
  const deleteChildren = useTodoStore((s) => s.deleteChildren);

  const handleClose = () => setTarget(null);

  const handleConfirm = async () => {
    if (!target) return;
    const success = await deleteChildren(target.id);
    if (success) handleClose();
  };

  return (
    <Modal open={target !== null} onClose={handleClose} label="하위항목 삭제">
      <ModalTitle className="mb-2 text-base font-semibold text-fg">
        하위항목 전체 삭제
      </ModalTitle>
      <p className="text-sm text-fg-secondary">
        하위항목을 모두 지웁니다. 위 할 일은 남습니다.
      </p>
      {target && (
        <p className="mt-2 truncate rounded-(--radius-btn) bg-muted px-3 py-2 text-sm text-fg">
          {target.content}
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
