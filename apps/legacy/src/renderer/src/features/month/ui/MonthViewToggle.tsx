import type { MonthViewMode } from "../model/useMonthStore";
import { cn } from "@renderer/utils/cn";
import { Button, MonthColumnsViewIcon, MonthTimelineViewIcon } from "@renderer/shared/ui";

type MonthViewToggleProps = {
  mode: MonthViewMode;
  onChange: (mode: MonthViewMode) => void;
};

const MODES: { id: MonthViewMode; label: string; Icon: typeof MonthColumnsViewIcon }[] = [
  { id: "columns", label: "열 보기", Icon: MonthColumnsViewIcon },
  { id: "timeline", label: "타임라인 보기", Icon: MonthTimelineViewIcon },
];

export function MonthViewToggle({ mode, onChange }: MonthViewToggleProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="월별 보기 방식">
      {MODES.map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "px-2 py-1.5",
              active && "bg-muted text-fg",
              !active && "text-fg-muted hover:text-fg",
            )}
            onClick={() => onChange(id)}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}
