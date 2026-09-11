import { create } from "zustand";

/** 테마 모드: 밝음 / 어두움 / 시스템 자동 */
export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "todo-theme-mode";

/** localStorage에서 저장된 테마 모드를 읽는다. */
function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }
  return "auto";
}

type ThemeState = {
  mode: ThemeMode;
};

type ThemeActions = {
  setMode: (mode: ThemeMode) => void;
};

type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()((set) => ({
  mode: readStoredMode(),
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    set({ mode });
  },
}));
