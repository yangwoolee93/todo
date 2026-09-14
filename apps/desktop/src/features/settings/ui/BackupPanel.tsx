import {
  useDataTransfer,
  transferTimeLabel,
  type TransferResult,
} from "../model/useDataTransfer";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

type DataTransferModalsProps = {
  importConfirmOpen: boolean;
  setImportConfirmOpen: (open: boolean) => void;
  result: TransferResult | null;
  setResult: (result: TransferResult | null) => void;
  handleImportConfirm: () => void | Promise<void>;
};

export function DataTransferModals({
  importConfirmOpen,
  setImportConfirmOpen,
  result,
  setResult,
  handleImportConfirm,
}: DataTransferModalsProps) {
  return (
    <>
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

/**
 * 데이터 백업·복원 패널 (F-04)
 */
export function BackupPanel() {
  const {
    meta,
    importConfirmOpen,
    setImportConfirmOpen,
    result,
    setResult,
    handleExportJson,
    handleImportConfirm,
  } = useDataTransfer();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleExportJson()}>JSON 내보내기</Button>
        <Button onClick={() => setImportConfirmOpen(true)}>JSON 불러오기</Button>
      </div>
      <p className="mt-3 text-xs text-fg-secondary">
        마지막 내보내기 {transferTimeLabel(meta.last_exported_at)}
      </p>
      <p className="mt-1 text-xs text-fg-secondary">
        마지막 불러오기 {transferTimeLabel(meta.last_imported_at)}
      </p>
      <DataTransferModals
        importConfirmOpen={importConfirmOpen}
        setImportConfirmOpen={setImportConfirmOpen}
        result={result}
        setResult={setResult}
        handleImportConfirm={handleImportConfirm}
      />
    </>
  );
}
