import { create } from "zustand";

export type SettingsSection = "home" | "display" | "data";

const sectionLabel: Record<SettingsSection, string> = {
  home: "설정",
  display: "화면",
  data: "데이터",
};

export function settingsSectionLabel(section: SettingsSection) {
  return sectionLabel[section];
}

type SettingsState = {
  section: SettingsSection;
  setSection: (section: SettingsSection) => void;
};

export const useSettingsStore = create<SettingsState>()((set) => ({
  section: "home",
  setSection: (section) => set({ section }),
}));
