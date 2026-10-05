import { cn } from "@renderer/utils/cn";
import { ChevronRightIcon } from "@renderer/shared/ui";
import type { AgendaItem } from "./agenda";

export default function MonthAgendaItem({
  item,
  fold,
}: {
  item: AgendaItem;
  fold?: { open: boolean; onToggle: () => void };
}) {
  return (
    <li
      className={cn(
        "relative rounded-(--radius-card) bg-surface py-3 pr-3",
        fold ? "pl-12" : "pl-6",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-2.5 bottom-2.5 left-2.5 w-0.75 rounded-full",
          "bg-fg-muted/50",
          item.status === "completed" && "bg-success",
          item.status === "failed" && "bg-failed",
        )}
      />
      {fold ? (
        <button
          type="button"
          className="absolute top-1/2 left-5 -translate-y-1/2 rounded p-0.5 text-fg-secondary hover:bg-muted hover:text-fg"
          aria-label={fold.open ? "하위 접기" : "하위 펼치기"}
          aria-expanded={fold.open}
          onClick={fold.onToggle}
        >
          <ChevronRightIcon
            className={cn("h-4 w-4 transition-transform", fold.open && "rotate-90")}
          />
        </button>
      ) : null}
      <span
        className={cn(
          "font-medium leading-snug text-fg line-clamp-2",
          item.status !== "pending" && "text-fg-muted",
          item.status === "failed" && "line-through",
        )}
      >
        {item.title}
      </span>
    </li>
  );
}
