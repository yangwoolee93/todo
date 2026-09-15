import { useEffect } from "react";
import { useUIStore, type SettingsSection } from "@renderer/stores/useUIStore";
import {
  DataSection,
  HomeList,
  InfoSection,
  ThemeSection,
} from "@renderer/widgets/settings";

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

function sectionLabel(section: Exclude<SettingsSection, "home">) {
  if (section === "theme") return "테마";
  if (section === "data") return "데이터";
  return "정보";
}

/** 설정 — 테마·데이터(보내기/불러오기) · 정보. */
export default function SettingPage() {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="m-6 mb-2 flex items-baseline gap-2 text-fg">
        {section === "home" ? (
          <span className="text-2xl font-medium">설정</span>
        ) : (
          <>
            <button
              type="button"
              className="text-2xl font-medium hover:text-fg-secondary focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
              onClick={goHome}
            >
              설정
            </button>
            <span className="text-fg-muted">›</span>
            <span className="text-sm font-medium text-fg-secondary">
              {sectionLabel(section)}
            </span>
          </>
        )}
      </div>

      <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
        {section === "home" && <HomeList onOpen={openSection} />}
        {section === "theme" && <ThemeSection />}
        {section === "data" && <DataSection />}
        {section === "info" && <InfoSection />}
      </div>
    </div>
  );
}
