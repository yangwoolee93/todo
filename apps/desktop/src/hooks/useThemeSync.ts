import { useEffect } from "react";
import { useThemeStore } from "@renderer/stores/useThemeStore";

/** html 요소에 dark 클래스를 적용/제거하고, 윈도우 타이틀바 overlay 색을 동기화한다. */
function applyDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
  window.electron?.setTitleBarOverlay?.(isDark);
}

/**
 * useThemeStore의 mode를 실제 DOM(dark 클래스)에 반영하는 훅
 * - auto: prefers-color-scheme 미디어 쿼리를 따른다.
 */
export function useThemeSync(): void {
  const mode = useThemeStore((s) => s.mode);

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
}
