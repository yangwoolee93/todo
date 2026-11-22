import { GlassButton } from "../../components/GlassButton";
import { useSidebarStore } from "../../stores/useSidebarStore";

export function DeleteConfirm() {
  const deleteTarget = useSidebarStore((state) => state.deleteTarget);
  const cancelDelete = useSidebarStore((state) => state.cancelDelete);
  const confirmDelete = useSidebarStore((state) => state.confirmDelete);

  if (!deleteTarget) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-fg/20"
      onMouseDown={cancelDelete}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        className="dialog-sm rounded-2xl border border-border bg-surface"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="delete-confirm-title" className="text-sm text-fg">
          내용이 있는데 삭제하시겠습니까?
        </p>
        <div className="mt-[1.143em] flex justify-end gap-[0.571em]">
          <GlassButton className="pad-sm text-sm" onClick={cancelDelete} autoFocus>
            취소
          </GlassButton>
          <GlassButton className="pad-sm text-sm" onClick={confirmDelete}>
            삭제
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
