import {
  DataTransferModals,
  transferTimeLabel,
  useDataTransfer,
} from "@renderer/features/settings";
import { settingsRowClass } from "./settingsRow";

export default function DataSection() {
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={settingsRowClass}
        onClick={() => void handleExportJson()}
      >
        <span className="block text-sm text-fg">JSON 내보내기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_exported_at)}
        </span>
      </button>
      <button
        type="button"
        className={settingsRowClass}
        onClick={() => setImportConfirmOpen(true)}
      >
        <span className="block text-sm text-fg">JSON 불러오기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_imported_at)}
        </span>
      </button>
      <p className="px-1 pt-1 text-xs text-fg-secondary">
        불러오면 할 일과 메모가 파일 내용으로 바뀝니다. 되돌릴 수 없습니다.
      </p>
      <DataTransferModals
        importConfirmOpen={importConfirmOpen}
        setImportConfirmOpen={setImportConfirmOpen}
        result={result}
        setResult={setResult}
        handleImportConfirm={handleImportConfirm}
      />
    </div>
  );
}
