import { invoke } from "@tauri-apps/api/core";
import { useDetailPanelStore } from "../../stores/useDetailPanelStore";
import { useMemoStore } from "../../stores/useMemoStore";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { useTimelineStore } from "../../stores/useTimelineStore";

export type ImportReport = {
  filePath: string;
  added: number;
  updated: number;
  deleted: number;
};

export type TransferTimes = {
  exportedAt: number | null;
  importedAt: number | null;
};

function inTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function exportDocument() {
  if (!inTauri()) throw new Error("앱을 다시 열면 파일을 주고받을 수 있습니다.");
  return invoke<string | null>("export_document");
}

export async function importDocument(mode: "merge" | "replace") {
  if (!inTauri()) throw new Error("앱을 다시 열면 파일을 주고받을 수 있습니다.");
  return invoke<ImportReport | null>("import_document", { mode });
}

export async function loadTransferTimes(): Promise<TransferTimes> {
  if (!inTauri()) return { exportedAt: null, importedAt: null };
  return invoke<TransferTimes>("transfer_times");
}

export async function reloadDocument() {
  useDetailPanelStore.getState().closePanel();
  await useSidebarStore.getState().hydrate();
  await Promise.all([useMemoStore.getState().hydrate(), useTimelineStore.getState().hydrate()]);
}
