import { createPortal } from "react-dom";
import { GlassButton } from "../../components/GlassButton";

export function TrashHoldConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/20"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trash-hold-title"
        className="dialog-sm rounded-2xl border border-border bg-surface"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="trash-hold-title" className="text-sm text-fg">
          삭제하면 휴지통에 보관됩니다. 삭제하시겠습니까?
        </p>
        <div className="mt-[1.143em] flex justify-end gap-[0.571em]">
          <GlassButton className="pad-sm text-sm" onClick={onCancel} autoFocus>
            취소
          </GlassButton>
          <GlassButton className="pad-sm text-sm" onClick={onConfirm}>
            확인
          </GlassButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
