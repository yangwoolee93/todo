export const MEMO_CATEGORY_COLORS = [
  "teal",
  "blue",
  "violet",
  "rose",
  "amber",
  "green",
  "orange",
  "slate",
] as const;

export type MemoCategoryColor = (typeof MEMO_CATEGORY_COLORS)[number];

const COLOR_LABEL: Record<MemoCategoryColor, string> = {
  teal: "청록",
  blue: "파랑",
  violet: "보라",
  rose: "장미",
  amber: "호박",
  green: "초록",
  orange: "주황",
  slate: "회색",
};

export function isMemoCategoryColor(value: string): value is MemoCategoryColor {
  return (MEMO_CATEGORY_COLORS as readonly string[]).includes(value);
}

export function memoColorVar(color: string | undefined): string {
  const id = color && isMemoCategoryColor(color) ? color : "slate";
  return `var(--color-memo-${id})`;
}

export function memoColorLabel(color: string): string {
  return isMemoCategoryColor(color) ? COLOR_LABEL[color] : COLOR_LABEL.slate;
}

export function nextUnusedMemoColor(used: string[]): MemoCategoryColor {
  const taken = new Set(used);
  return MEMO_CATEGORY_COLORS.find((color) => !taken.has(color)) ?? MEMO_CATEGORY_COLORS[0];
}
