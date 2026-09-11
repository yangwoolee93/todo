import { cn } from "@renderer/utils/cn";

export default function YearCell({
  item,
  isSelected,
  onClick,
}: {
  item: number;
  isSelected: boolean;
  onClick: (item: number) => void;
}) {
  const thisYear = new Date().getFullYear();
  const isThisYear = item === thisYear;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-center rounded-(--radius-card) py-3 gap-3",
        "border-2 border-transparent bg-surface",
        "hover:bg-muted",
        isSelected && "border-accent",
      )}
      onClick={() => onClick(item)}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          "bg-fg-secondary/10 hidden",
          isThisYear && "bg-fg-secondary flex",
        )}
      />
      <span className="text-xl font-medium leading-none">
        {item}
        <span className="text-[0.75rem] font-normal text-fg-secondary">년</span>
      </span>
    </button>
  );
}
