import { MonitorIcon, MoonIcon, SunIcon } from "@renderer/shared/ui";
import { type ThemeMode } from "@renderer/stores/useThemeStore";

export const THEME_OPTIONS: {
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

export function themeLabel(mode: ThemeMode) {
  return THEME_OPTIONS.find((option) => option.value === mode)?.label ?? "시스템";
}
