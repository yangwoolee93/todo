import type { PageTypeId } from "../sidebar/pageTypes";

export const detailLayout: Record<
  PageTypeId,
  { panelMin: number; contentMin: number }
> = {
  memo: { panelMin: 280, contentMin: 240 },
  timeline: { panelMin: 320, contentMin: 360 },
};
