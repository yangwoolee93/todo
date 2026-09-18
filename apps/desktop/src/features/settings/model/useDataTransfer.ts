import { useCallback, useEffect, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
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
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const loadMemos = useMemoStore((s) => s.loadMemos);

  const [meta, setMeta] = useState<DataTransferMeta>(EMPTY_META);
  const [importModeOpen, setImportModeOpen] = useState(false);
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
    await Promise.all([loadTodosByDate(activeDate), loadMemos()]);
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

  /** 병합 — 현재 데이터를 유지한 채 파일 내용을 더한다(덮어쓰기 아님). */
  const handleImportMerge = async () => {
    setImportModeOpen(false);
    const res = await window.api.importJsonMerge();
    if (res.success && res.data) {
      const { added, updated, deleted } = res.data;
      setResult({
        title: "JSON 병합 완료",
        message: `추가 ${added} · 갱신 ${updated} · 삭제 ${deleted}`,
      });
      await refreshAppData();
      await loadMeta();
    } else if (res.success && !res.data) {
      // 취소 — 아무것도 하지 않음
    } else if (!res.success && res.error) {
      setResult({ title: "병합 실패", message: res.error, isError: true });
    }
  };

  return {
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
  };
}
