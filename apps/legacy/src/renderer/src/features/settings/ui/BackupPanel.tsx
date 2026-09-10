import { useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import { Modal, ModalTitle, Button } from "@renderer/shared/ui";

type ResultModal = {
  title: string;
  message: string;
  isError?: boolean;
};

/**
 * 데이터 백업·복원 패널 (F-04)
 */
export function BackupPanel() {
  const activeDate = useUIStore((s) => s.activeDate);
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);

  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [result, setResult] = useState<ResultModal | null>(null);

  const refresh = async () => {
    await Promise.all([loadTodosByDate(activeDate), loadMonthSummary(yearMonth)]);
  };

  const handleExportJson = async () => {
    const res = await window.api.exportJson();
    if (res.success && res.data?.filePath) {
      setResult({ title: "JSON 내보내기 완료", message: res.data.filePath });
    } else if (!res.success && res.error) {
      setResult({ title: "내보내기 실패", message: res.error, isError: true });
    }
  };

  const handleExportSql = async () => {
    const res = await window.api.exportSql();
    if (res.success && res.data?.filePath) {
      setResult({ title: "SQL 내보내기 완료", message: res.data.filePath });
    } else if (!res.success && res.error) {
      setResult({ title: "내보내기 실패", message: res.error, isError: true });
    }
  };

  const handleImportConfirm = async () => {
    setImportConfirmOpen(false);
    const res = await window.api.importJson();
    if (res.success && res.data?.filePath) {
      setResult({ title: "JSON 불러오기 완료", message: res.data.filePath });
      await refresh();
    } else if (!res.success && res.error) {
      setResult({ title: "불러오기 실패", message: res.error, isError: true });
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleExportJson()}>JSON 내보내기</Button>
        <Button onClick={() => void handleExportSql()}>SQL 내보내기</Button>
        <Button onClick={() => setImportConfirmOpen(true)}>JSON 불러오기</Button>
      </div>

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
