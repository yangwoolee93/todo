import { useCallback, useEffect, useState } from "react";

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

/** html 요소에 dark 클래스를 적용/제거한다. */
function applyDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * 밝은/어두운/자동 테마를 관리하는 Hook
 * - auto: prefers-color-scheme 미디어 쿼리를 따른다.
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  /** 테마 모드를 변경하고 localStorage에 저장한다. */
  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (mode === "light") {
      applyDarkClass(false);
      return;
    }

    if (mode === "dark") {
      applyDarkClass(true);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => applyDarkClass(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [mode]);

  return { mode, setMode };
}
