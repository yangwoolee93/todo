import { CaretRightIcon, MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { fontStepLabel, fontSteps } from "./fontSteps";
import { useFontSizeStore } from "../../stores/useFontSizeStore";
import {
  settingsSectionLabel,
  useSettingsStore,
} from "../../stores/useSettingsStore";
import { useThemeStore, type ThemeMode } from "../../stores/useThemeStore";
import { cn } from "../../utils/cn";

const themeOptions: {
  value: ThemeMode;
  label: string;
  desc: string;
  icon: typeof SunIcon;
}[] = [
  { value: "light", label: "밝음", desc: "밝은 화면", icon: SunIcon },
  { value: "dark", label: "어두움", desc: "어두운 화면", icon: MoonIcon },
  { value: "auto", label: "시스템", desc: "시스템 설정을 따름", icon: MonitorIcon },
];

function themeLabel(mode: ThemeMode) {
  return themeOptions.find((option) => option.value === mode)?.label ?? "시스템";
}

function SettingsLink({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:bg-fg/5"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-1 block text-xs text-fg-secondary">{detail}</span>
      </span>
      <CaretRightIcon
        aria-hidden="true"
        size={16}
        className="shrink-0 text-fg-secondary"
      />
    </button>
  );
}

function SettingsHome() {
  const step = useFontSizeStore((state) => state.step);
  const mode = useThemeStore((state) => state.mode);
  const setSection = useSettingsStore((state) => state.setSection);

  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">
        {settingsSectionLabel("home")}
      </h1>
      <div className="mt-4 flex max-w-xl flex-col gap-2">
        <SettingsLink
          title={settingsSectionLabel("display")}
          detail={`${themeLabel(mode)} · 글자 크기 ${fontStepLabel(step)}`}
          onClick={() => setSection("display")}
        />
        <SettingsLink
          title={settingsSectionLabel("data")}
          detail="Google Drive"
          onClick={() => setSection("data")}
        />
      </div>
    </div>
  );
}

function ThemeControl() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const current = themeOptions.find((option) => option.value === mode) ?? themeOptions[2];

  return (
    <section className="@container rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">테마</p>
      <div
        role="radiogroup"
        aria-label="테마"
        className="mt-3 grid grid-cols-1 gap-1 rounded-2xl bg-fg/5 p-1 @min-[20rem]:grid-cols-3 @min-[20rem]:rounded-full"
      >
        {themeOptions.map((option) => {
          const selected = option.value === mode;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl pad-seg text-sm whitespace-nowrap",
                "@min-[20rem]:rounded-full",
                selected ? "bg-fg/15 text-fg" : "text-fg-secondary hover:bg-fg/10",
              )}
              onClick={() => setMode(option.value)}
            >
              <Icon aria-hidden="true" size={16} className="shrink-0" />
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-fg-secondary">{current.desc}</p>
    </section>
  );
}

function FontSizeControl() {
  const step = useFontSizeStore((state) => state.step);
  const setStep = useFontSizeStore((state) => state.setStep);
  const index = Math.max(
    0,
    fontSteps.findIndex((item) => item.id === step),
  );
  const fill = `${(index / (fontSteps.length - 1)) * 100}%`;

  return (
    <section className="settings-scale rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">글자 크기</p>
      <input
        className="settings-range mt-4"
        type="range"
        min={0}
        max={fontSteps.length - 1}
        step={1}
        value={index}
        aria-label="글자 크기"
        aria-valuetext={fontStepLabel(step)}
        style={{ "--fill": fill } as CSSProperties}
        onChange={(event) => {
          const next = fontSteps[Number(event.target.value)];
          if (next) setStep(next.id);
        }}
      />
      <div className="relative mt-1 h-5">
        {fontSteps.map((item, itemIndex) => {
          const selected = itemIndex === index;
          const ratio = itemIndex / (fontSteps.length - 1);
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap",
                selected ? "text-fg" : "text-fg-muted",
              )}
              style={{
                left: `calc(var(--thumb) / 2 + ${ratio} * (100% - var(--thumb)))`,
              }}
              onClick={() => setStep(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DisplaySection() {
  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">
        {settingsSectionLabel("display")}
      </h1>
      <div className="mt-4 flex max-w-xl flex-col gap-2">
        <ThemeControl />
        <FontSizeControl />
      </div>
    </div>
  );
}

function DataSection() {
  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">
        {settingsSectionLabel("data")}
      </h1>
      <p className="mt-1 text-sm text-fg-secondary">Google Drive</p>
      <div className="mt-4 max-w-xl rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-fg">계정</p>
        <p className="mt-1 text-xs text-fg-secondary">
          연결하면 이 기기의 프로젝트와 메모를 내 Drive와 맞춥니다.
        </p>
        <p className="mt-3 text-xs text-fg-secondary">연결 전</p>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const section = useSettingsStore((state) => state.section);
  if (section === "display") return <DisplaySection />;
  if (section === "data") return <DataSection />;
  return <SettingsHome />;
}
