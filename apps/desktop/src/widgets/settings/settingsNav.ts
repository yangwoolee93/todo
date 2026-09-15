import { useEffect } from "react";
import { useUIStore, type SettingsSection } from "@renderer/stores/useUIStore";

function readHistorySection(state: unknown): SettingsSection {
  const section = (state as { settingsSection?: unknown } | null)
    ?.settingsSection;
  if (
    section === "theme" ||
    section === "data" ||
    section === "info" ||
    section === "home"
  ) {
    return section;
  }
  return "home";
}

export function sectionLabel(section: Exclude<SettingsSection, "home">) {
  if (section === "theme") return "테마";
  if (section === "data") return "데이터";
  return "정보";
}

export function useSettingsNav() {
  const section = useUIStore((s) => s.settingsSection);
  const setSettingsSection = useUIStore((s) => s.setSettingsSection);

  useEffect(() => {
    history.replaceState({ settingsSection: "home" }, "");

    const onPop = (event: PopStateEvent) => {
      setSettingsSection(readHistorySection(event.state));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setSettingsSection]);

  const goHome = () => {
    if (section === "home") return;
    history.back();
  };

  const openSection = (next: SettingsSection) => {
    if (next === "home") {
      goHome();
      return;
    }
    if (section === "home") {
      history.pushState({ settingsSection: next }, "");
    } else {
      history.replaceState({ settingsSection: next }, "");
    }
    setSettingsSection(next);
  };

  return { section, goHome, openSection };
}
