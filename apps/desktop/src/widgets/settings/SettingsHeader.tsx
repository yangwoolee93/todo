import { type SettingsSection } from "@renderer/stores/useUIStore";
import { sectionLabel } from "./settingsNav";

export default function SettingsHeader({
  section,
  onHome,
}: {
  section: SettingsSection;
  onHome: () => void;
}) {
  return (
    <div className="m-6 mb-2 flex items-baseline gap-2 text-fg">
      {section === "home" ? (
        <span className="text-2xl font-medium">설정</span>
      ) : (
        <>
          <button
            type="button"
            className="text-2xl font-medium hover:text-fg-secondary focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
            onClick={onHome}
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
  );
}
