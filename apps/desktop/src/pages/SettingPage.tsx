import {
  DataSection,
  HomeList,
  InfoSection,
  SettingsHeader,
  ThemeSection,
  useSettingsNav,
} from "@renderer/widgets/settings";

/** 설정 — 테마·데이터(보내기/불러오기) · 정보. */
export default function SettingPage() {
  const { section, goHome, openSection } = useSettingsNav();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SettingsHeader section={section} onHome={goHome} />

      <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
        {section === "home" && <HomeList onOpen={openSection} />}
        {section === "theme" && <ThemeSection />}
        {section === "data" && <DataSection />}
        {section === "info" && <InfoSection />}
      </div>
    </div>
  );
}
