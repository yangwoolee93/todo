import { create } from "zustand";
import { fontSteps, type FontStepId } from "../features/settings/fontSteps";

const STORAGE_KEY = "arc-font-step";

function readStoredStep(): FontStepId {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (fontSteps.some((step) => step.id === stored)) return stored as FontStepId;
  return "medium";
}

type FontSizeState = {
  step: FontStepId;
  setStep: (step: FontStepId) => void;
};

export const useFontSizeStore = create<FontSizeState>()((set) => ({
  step: readStoredStep(),
  setStep: (step) => {
    localStorage.setItem(STORAGE_KEY, step);
    set({ step });
  },
}));
