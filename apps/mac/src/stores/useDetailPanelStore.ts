import { create } from "zustand";

export const DETAIL_PANEL_DEFAULT_WIDTH = 320;

export type DetailPurpose = "item" | "statuses";

type DetailPanelState = {
  open: boolean;
  width: number;
  purpose: DetailPurpose;
  openPanel: () => void;
  openStatuses: () => void;
  closePanel: () => void;
  setWidth: (width: number) => void;
};

export const useDetailPanelStore = create<DetailPanelState>((set) => ({
  open: false,
  width: DETAIL_PANEL_DEFAULT_WIDTH,
  purpose: "item",
  openPanel: () => set({ open: true, purpose: "item" }),
  openStatuses: () => set({ open: true, purpose: "statuses" }),
  closePanel: () => set({ open: false, purpose: "item" }),
  setWidth: (width) => set({ width: Math.max(0, Math.round(width)) }),
}));
