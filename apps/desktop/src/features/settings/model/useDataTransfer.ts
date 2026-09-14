import { useCallback, useEffect, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { useMonthStore } from "@renderer/features/month/model/useMonthStore";
import { useMemoStore } from "@renderer/features/memo/model/useMemoStore";
import { formatDateTime } from "@renderer/utils/dateUtils";
import type { DataTransferMeta } from "@shared/types/todo";

export type TransferResult = {
  title: string;
  message: string;
  isError?: boolean;
};

const EMPTY_META: DataTransferMeta = {
  last_exported_at: null,
  last_imported_at: null,
};

/** 보내기·불러오기 시각 라벨. 없으면 "없음". */
export function transferTimeLabel(ms: number | null | undefined): string {
  if (ms == null) return "없음";
  return formatDateTime(ms);
}

/** JSON 보내기·불러오기와 최근 시각 조회 */
export function useDataTransfer() {
  const activeDate = useUIStore((s) => s.activeDate);
  const yearMonth = useMonthStore((s) => s.yearMonth);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary);
  const loadMemos = useMemoStore((s) => s.loadMemos);

  const [meta, setMeta] = useState<DataTransferMeta>(EMPTY_META);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  const loadMeta = useCallback(async () => {
    const res = await window.api.getDataTransferMeta();
    if (res.success && res.data) {
      setMeta({
        last_exported_at: res.data.last_exported_at ?? null,
        last_imported_at: res.data.last_imported_at ?? null,
      });
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const refreshAppData = async () => {
    await Promise.all([
      loadTodosByDate(activeDate),
      loadMonthSummary(yearMonth),
      loadMemos(),
    ]);
  };

  const handleExportJson = async () => {
    const res = await window.api.exportJson();
    if (res.success && res.data?.filePath) {
      setResult({ title: "JSON 내보내기 완료", message: res.data.filePath });
      await loadMeta();
    } else if (!res.success && res.error) {
      setResult({ title: "내보내기 실패", message: res.error, isError: true });
    }
  };

  const handleImportConfirm = async () => {
    setImportConfirmOpen(false);
    const res = await window.api.importJson();
    if (res.success && res.data?.filePath) {
      setResult({ title: "JSON 불러오기 완료", message: res.data.filePath });
      await refreshAppData();
      await loadMeta();
    } else if (!res.success && res.error) {
      setResult({ title: "불러오기 실패", message: res.error, isError: true });
    }
  };

  return {
    meta,
    importConfirmOpen,
    setImportConfirmOpen,
    result,
    setResult,
    handleExportJson,
    handleImportConfirm,
  };
}
