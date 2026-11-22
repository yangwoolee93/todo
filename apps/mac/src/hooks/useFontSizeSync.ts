import { useLayoutEffect } from "react";
import { useFontSizeStore } from "../stores/useFontSizeStore";

/** html의 data-font-step에 글자 단계를 반영한다. */
export function useFontSizeSync(): void {
  const step = useFontSizeStore((state) => state.step);

  useLayoutEffect(() => {
    document.documentElement.dataset.fontStep = step;
  }, [step]);
}
