import { create } from "zustand";

export const DETAIL_PANEL_DEFAULT_WIDTH = 320;

type DetailPanelState = {
  open: boolean;
  width: number;
  openPanel: () => void;
  closePanel: () => void;
  setWidth: (width: number) => void;
};

export const useDetailPanelStore = create<DetailPanelState>((set) => ({
  open: false,
  width: DETAIL_PANEL_DEFAULT_WIDTH,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  setWidth: (width) => set({ width: Math.max(0, Math.round(width)) }),
}));
