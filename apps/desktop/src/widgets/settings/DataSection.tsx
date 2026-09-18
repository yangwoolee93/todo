import {
  DataTransferModals,
  transferTimeLabel,
  useDataTransfer,
} from "@renderer/features/settings";
import { settingsRowClass } from "./settingsRow";

export default function DataSection() {
  const {
    meta,
    importModeOpen,
    setImportModeOpen,
    importConfirmOpen,
    setImportConfirmOpen,
    result,
    setResult,
    handleExportJson,
    handleImportConfirm,
    handleImportMerge,
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
        onClick={() => setImportModeOpen(true)}
      >
        <span className="block text-sm text-fg">JSON 불러오기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_imported_at)}
        </span>
      </button>
      <p className="px-1 pt-1 text-xs text-fg-secondary">
        병합은 겹치는 항목만 최신 것으로 정리하고, 덮어쓰기는 현재 데이터를 파일
        내용으로 완전히 바꿉니다. 두 방식 모두 불러오기 전 상태를 자동으로
        백업해 둡니다.
      </p>
      <DataTransferModals
        importModeOpen={importModeOpen}
        setImportModeOpen={setImportModeOpen}
        importConfirmOpen={importConfirmOpen}
        setImportConfirmOpen={setImportConfirmOpen}
        result={result}
        setResult={setResult}
        handleImportConfirm={handleImportConfirm}
        handleImportMerge={handleImportMerge}
      />
    </div>
  );
}
