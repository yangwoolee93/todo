import { ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";

export default function StripArrow({
  direction,
  disabled,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-full w-4 shrink-0 items-center justify-center rounded-sm text-fg-secondary",
        "hover:bg-muted hover:text-fg",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
      onClick={onClick}
    >
      {direction === "prev" ? (
        <ChevronLeftIcon className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRightIcon className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
}
