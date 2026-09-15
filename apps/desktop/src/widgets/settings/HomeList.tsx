import { type ReactNode } from "react";
import { cn } from "@renderer/utils/cn";
import { ChevronRightIcon } from "@renderer/shared/ui";
import { type SettingsSection } from "@renderer/stores/useUIStore";
import { useThemeStore } from "@renderer/stores/useThemeStore";
import { transferTimeLabel, useDataTransfer } from "@renderer/features/settings";
import { rowClass } from "./rowClass";
import { themeLabel } from "./themeOptions";

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

export default function HomeList({
  onOpen,
}: {
  onOpen: (section: SettingsSection) => void;
}) {
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
