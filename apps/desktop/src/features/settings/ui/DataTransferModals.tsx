import { type TransferResult } from "../model/useDataTransfer";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

type DataTransferModalsProps = {
  importModeOpen: boolean;
  setImportModeOpen: (open: boolean) => void;
  importConfirmOpen: boolean;
  setImportConfirmOpen: (open: boolean) => void;
  result: TransferResult | null;
  setResult: (result: TransferResult | null) => void;
  handleImportConfirm: () => void | Promise<void>;
  handleImportMerge: () => void | Promise<void>;
};

export function DataTransferModals({
  importModeOpen,
  setImportModeOpen,
  importConfirmOpen,
  setImportConfirmOpen,
  result,
  setResult,
  handleImportConfirm,
  handleImportMerge,
}: DataTransferModalsProps) {
  return (
    <>
      <Modal
        open={importModeOpen}
        onClose={() => setImportModeOpen(false)}
        label="불러오기 방식 선택"
      >
        <ModalTitle className="mb-2 text-base font-semibold text-fg">
          어떻게 불러올까요?
        </ModalTitle>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-(--radius-btn) bg-muted px-3 py-2 text-left hover:bg-muted/70"
            onClick={() => void handleImportMerge()}
          >
            <span className="block text-sm text-fg">병합</span>
            <span className="mt-0.5 block text-xs text-fg-secondary">
              현재 데이터를 유지하고, 겹치는 항목은 더 최근에 고친 쪽만 남깁니다.
            </span>
          </button>
          <button
            type="button"
            className="rounded-(--radius-btn) bg-muted px-3 py-2 text-left hover:bg-muted/70"
            onClick={() => {
              setImportModeOpen(false);
              setImportConfirmOpen(true);
            }}
          >
            <span className="block text-sm text-fg">덮어쓰기</span>
            <span className="mt-0.5 block text-xs text-fg-secondary">
              현재 데이터를 지우고 파일 내용으로 완전히 바꿉니다.
            </span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => setImportModeOpen(false)}>
            취소
          </Button>
        </div>
      </Modal>

      <Modal
        open={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        label="데이터 불러오기 확인"
      >
        <ModalTitle className="mb-2 text-base font-semibold text-fg">데이터 불러오기</ModalTitle>
        <p className="text-sm text-fg-secondary">
          현재 저장된 데이터가 선택한 JSON 파일로 전체 교체됩니다.
        </p>
        <p className="mt-2 rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setImportConfirmOpen(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={() => void handleImportConfirm()}>
            불러오기
          </Button>
        </div>
      </Modal>

      <Modal open={result !== null} onClose={() => setResult(null)} label={result?.title ?? "결과"}>
        <ModalTitle
          className={`mb-2 text-base font-semibold ${result?.isError ? "text-danger" : "text-fg"}`}
        >
          {result?.title}
        </ModalTitle>
        <p className="break-all rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
          {result?.message}
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => setResult(null)}>
            확인
          </Button>
        </div>
      </Modal>
    </>
  );
}
