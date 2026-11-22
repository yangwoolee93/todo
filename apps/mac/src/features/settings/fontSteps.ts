export const fontSteps = [
  { id: "xsmall", label: "매우작음" },
  { id: "small", label: "작음" },
  { id: "medium", label: "보통" },
  { id: "large", label: "큰" },
  { id: "xlarge", label: "매우큰" },
] as const;

export type FontStepId = (typeof fontSteps)[number]["id"];

export function fontStepLabel(step: FontStepId) {
  return fontSteps.find((item) => item.id === step)?.label ?? "보통";
}
