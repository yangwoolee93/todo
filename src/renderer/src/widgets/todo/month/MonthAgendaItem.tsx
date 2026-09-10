import { cn } from "@renderer/utils/cn";
import type { AgendaItem } from "./monthAgendaTempUtil";

export default function MonthAgendaItem({ item }: { item: AgendaItem }) {
  return (
    <li className="relative rounded-(--radius-card) bg-surface py-3 pr-3 pl-6">
      <span
        aria-hidden
        className={cn(
          "absolute top-2.5 bottom-2.5 left-2.5 w-0.75 rounded-full",
          "bg-fg-muted/50",
          item.status === "completed" && "bg-success",
          item.status === "failed" && "bg-failed",
        )}
      />
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
