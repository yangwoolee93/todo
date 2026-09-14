import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@renderer/utils/cn";
import { useUIStore, type SettingsSection } from "@renderer/stores/useUIStore";
import {
  Button,
  ChevronRightIcon,
  Modal,
  ModalTitle,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@renderer/shared/ui";
import { ThemeMode, useThemeStore } from "@renderer/stores/useThemeStore";
import { APP_VERSION } from "@renderer/constants/appVersion";
import {
  DataTransferModals,
  OPEN_SOURCE_LIBS,
  transferTimeLabel,
  useDataTransfer,
} from "@renderer/features/settings";

const rowClass = cn(
  "w-full rounded-(--radius-card) bg-surface px-3 py-3 text-left",
  "hover:bg-muted",
);

const infoRowClass = cn(
  "w-full rounded-(--radius-card) bg-surface px-3 py-3 text-left",
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

/** 설정 v2 — 테마·데이터(보내기/불러오기) · 정보. */
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
        {section === "data" && <DataSection />}
        {section === "info" && <InfoSection />}
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

function HomeNavButton({
  title,
  children,
  onClick,
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(rowClass, "flex items-center gap-3")}
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-fg">{title}</span>
        {children}
      </span>
      <ChevronRightIcon className="text-fg-muted" />
    </button>
  );
}

function HomeList({ onOpen }: { onOpen: (section: SettingsSection) => void }) {
  const mode = useThemeStore((s) => s.mode);
  const { meta } = useDataTransfer();

  return (
    <div className="flex flex-col gap-2">
      <HomeNavButton title="테마 설정" onClick={() => onOpen("theme")}>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          {themeLabel(mode)}
        </span>
      </HomeNavButton>
      <HomeNavButton title="데이터 관리" onClick={() => onOpen("data")}>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 내보내기 {transferTimeLabel(meta.last_exported_at)}
        </span>
        <span className="block text-xs text-fg-secondary">
          마지막 불러오기 {transferTimeLabel(meta.last_imported_at)}
        </span>
      </HomeNavButton>
      <HomeNavButton title="앱 정보" onClick={() => onOpen("info")}>
        <span className="mt-0.5 block text-xs text-fg-secondary">앱, 버전</span>
        <span className="block text-xs text-fg-secondary">
          데이터 경로, 사용한 오픈소스
        </span>
      </HomeNavButton>
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

function DataSection() {
  const {
    meta,
    importConfirmOpen,
    setImportConfirmOpen,
    result,
    setResult,
    handleExportJson,
    handleImportConfirm,
  } = useDataTransfer();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={rowClass}
        onClick={() => void handleExportJson()}
      >
        <span className="block text-sm text-fg">JSON 내보내기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_exported_at)}
        </span>
      </button>
      <button
        type="button"
        className={rowClass}
        onClick={() => setImportConfirmOpen(true)}
      >
        <span className="block text-sm text-fg">JSON 불러오기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_imported_at)}
        </span>
      </button>
      <p className="px-1 pt-1 text-xs text-fg-secondary">
        불러오면 할 일과 메모가 파일 내용으로 바뀝니다. 되돌릴 수 없습니다.
      </p>
      <DataTransferModals
        importConfirmOpen={importConfirmOpen}
        setImportConfirmOpen={setImportConfirmOpen}
        result={result}
        setResult={setResult}
        handleImportConfirm={handleImportConfirm}
      />
    </div>
  );
}

function InfoSection() {
  const [storePath, setStorePath] = useState<string | null>(null);
  const [pathError, setPathError] = useState(false);
  const [openDirConfirm, setOpenDirConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.api.getStorePath().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setStorePath(res.data);
        return;
      }
      setPathError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openStoreDir = async () => {
    if (!storePath) return;
    const dir = storePath.replace(/[\\/][^\\/]+$/, "");
    if (!dir) return;
    setOpenDirConfirm(false);
    const { openPath } = await import("@tauri-apps/plugin-opener");
    await openPath(dir);
  };

  const openLibSite = async (url: string) => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className={infoRowClass}>
        <p className="text-xs text-fg-secondary">앱</p>
        <p className="mt-0.5 text-sm text-fg">Orbit</p>
      </div>
      <div className={infoRowClass}>
        <p className="text-xs text-fg-secondary">버전</p>
        <p className="mt-0.5 text-sm text-fg">{APP_VERSION} (프리릴리즈)</p>
      </div>
      <button
        type="button"
        className={cn(rowClass, !storePath && "cursor-default")}
        disabled={!storePath}
        onClick={() => setOpenDirConfirm(true)}
      >
        <p className="text-xs text-fg-secondary">데이터 경로</p>
        <p className="mt-0.5 break-all text-sm text-fg">
          {pathError
            ? "경로를 불러오지 못했습니다"
            : (storePath ?? "불러오는 중…")}
        </p>
      </button>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="px-1 text-xs text-fg-secondary">사용한 오픈소스</p>
        <ul
          className={cn(
            "scrollbar grid min-h-0 min-w-0 flex-1 content-start gap-2",
            "grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]",
            "overflow-x-hidden overflow-y-auto",
          )}
        >
          {OPEN_SOURCE_LIBS.map((lib) => (
            <li key={lib.name} className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 flex-col items-center justify-center gap-3",
                  "rounded-(--radius-card) bg-surface px-1.5 py-2.5 border-2 border-transparent",
                  "hover:border-accent-soft hover:bg-muted",
                )}
                onClick={() => void openLibSite(lib.url)}
              >
                <lib.icon className="size-8" />
                <span className="w-full text-center text-sm font-semibold leading-tight text-fg">
                  {lib.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Modal
        open={openDirConfirm}
        onClose={() => setOpenDirConfirm(false)}
        label="데이터 폴더 열기"
      >
        <ModalTitle className="mb-2 text-base font-semibold text-fg">
          데이터 폴더 열기
        </ModalTitle>
        <p className="text-sm text-fg-secondary">
          데이터가 저장된 폴더를 엽니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenDirConfirm(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={() => void openStoreDir()}>
            열기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
