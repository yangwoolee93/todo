import { create } from "zustand";
import type { AppView } from "@renderer/types/views";

interface UIState {
  view: AppView;
  setView: (view: AppView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: "today",
  setView: (view) => set({ view }),
}));
