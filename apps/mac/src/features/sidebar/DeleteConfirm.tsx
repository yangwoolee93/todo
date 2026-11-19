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
        className="w-72 rounded-2xl border border-border bg-surface p-4"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="delete-confirm-title" className="text-sm text-fg">
          내용이 있는데 삭제하시겠습니까?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GlassButton className="px-3 py-1.5 text-sm" onClick={cancelDelete} autoFocus>
            취소
          </GlassButton>
          <GlassButton className="px-3 py-1.5 text-sm" onClick={confirmDelete}>
            삭제
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
