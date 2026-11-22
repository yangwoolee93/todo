import { useFontSizeStore } from "../stores/useFontSizeStore";
import type { FontStepId } from "../features/settings/fontSteps";

const iconScale: Record<FontStepId, number> = {
  xsmall: 0.75,
  small: 0.875,
  medium: 1,
  large: 1.125,
  xlarge: 1.25,
};

export function useIconScale() {
  const step = useFontSizeStore((state) => state.step);
  return (size: number) => Math.round(size * iconScale[step]);
}
