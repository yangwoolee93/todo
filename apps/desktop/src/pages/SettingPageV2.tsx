import { useEffect } from "react";
import { cn } from "@renderer/utils/cn";
import { useUIStore, type SettingsSection } from "@renderer/stores/useUIStore";
import { MonitorIcon, MoonIcon, SunIcon } from "@renderer/shared/ui";
import { ThemeMode, useThemeStore } from "@renderer/stores/useThemeStore";

const rowClass = cn(
  "w-full rounded-(--radius-card) bg-surface px-3 py-3 text-left",
  "hover:bg-muted",
);

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

/** 설정 v2 — UI 골격만. 기능은 이후 이관. */
export default function SettingPageV2() {
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
        {section === "data" && <DataPlaceholder />}
        {section === "info" && <InfoPlaceholder />}
      </div>
    </div>
  );
}

function sectionLabel(section: Exclude<SettingsSection, "home">) {
  if (section === "theme") return "테마";
  if (section === "data") return "데이터";
  return "정보";
}

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  desc: string;
  icon: typeof SunIcon;
}[] = [
  {
    value: "light",
    label: "라이트",
    desc: "밝은 테마",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "다크",
    desc: "어두운 테마",
    icon: MoonIcon,
  },
  {
    value: "auto",
    label: "시스템",
    desc: "시스템 테마 설정을 따름",
    icon: MonitorIcon,
  },
];

function themeLabel(mode: ThemeMode) {
  return (
    THEME_OPTIONS.find((option) => option.value === mode)?.label ?? "시스템"
  );
}

function HomeList({ onOpen }: { onOpen: (section: SettingsSection) => void }) {
  const mode = useThemeStore((s) => s.mode);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={rowClass}
        onClick={() => onOpen("theme")}
      >
        <span className="block text-sm text-fg">테마</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          {themeLabel(mode)}
        </span>
      </button>
      <button type="button" className={rowClass} onClick={() => onOpen("data")}>
        <span className="block text-sm text-fg">데이터</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          JSON 내보내기 · 불러오기
        </span>
      </button>
      <button type="button" className={rowClass} onClick={() => onOpen("info")}>
        <span className="block text-sm text-fg">정보</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          버전 · 경로
        </span>
      </button>
    </div>
  );
}

function ThemeSection() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const selectedIndex = THEME_OPTIONS.findIndex(
    (option) => option.value === mode,
  );
  const current = THEME_OPTIONS[selectedIndex] ?? THEME_OPTIONS[2];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex items-center justify-between",
          "rounded-(--radius-btn) bg-surface p-4 gap-4",
        )}
      >
        <div className="flex flex-1 flex-col items-start gap-4">
          <p className="text-md font-bold text-fg">{current.label}</p>
          <p className="mt-1 text-xs text-fg-secondary">{current.desc}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="relative flex rounded-full bg-muted p-1">
            {THEME_OPTIONS.map((option, i) => (
              <button
                key={"shadow-" + option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                aria-label={option.label}
                className={cn(
                  "relative size-8 rounded-full",
                  "bg-surface/70 mx-8",
                  i === 0 && "ml-0",
                  i === 2 && "mr-0",
                )}
                onClick={() => setMode(option.value)}
              />
            ))}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1 ",
                "size-8 rounded-full",
                "bg-accent shadow-sm transition-transform duration-200",
              )}
              style={{ transform: `translateX(${selectedIndex * 96}px)` }}
            />
          </div>
          <div className={cn("flex gap-16")}>
            {THEME_OPTIONS.map((option) => (
              <span
                key={option.value}
                className={cn(
                  "flex size-8 items-center justify-center text-fg-secondary",
                  mode === option.value && "text-fg",
                )}
              >
                <option.icon />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DataPlaceholder() {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={rowClass}>
        JSON 내보내기
      </button>
      <button type="button" className={rowClass}>
        JSON 불러오기
      </button>
      <p className="px-1 pt-1 text-xs text-fg-secondary">
        불러오면 할 일과 메모가 파일 내용으로 바뀝니다. 되돌릴 수 없습니다.
      </p>
    </div>
  );
}

function InfoPlaceholder() {
  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-(--radius-btn) border border-border bg-surface px-3 py-2.5">
        <p className="text-xs text-fg-secondary">앱</p>
        <p className="text-sm text-fg">Orbit</p>
      </div>
      <div className="rounded-(--radius-btn) border border-border bg-surface px-3 py-2.5">
        <p className="text-xs text-fg-secondary">버전</p>
        <p className="text-sm text-fg">PRE_RELEASE</p>
      </div>
      <div className="rounded-(--radius-btn) border border-border bg-surface px-3 py-2.5">
        <p className="text-xs text-fg-secondary">데이터 경로</p>
        <p className="break-all text-sm text-fg">경로가 여기 표시됩니다</p>
      </div>
    </div>
  );
}
