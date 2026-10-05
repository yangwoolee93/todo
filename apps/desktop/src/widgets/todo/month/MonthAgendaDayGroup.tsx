import { cn } from "@renderer/utils/cn";
import { ChevronRightIcon } from "@renderer/shared/ui";
import { koreanPublicHolidayName } from "@renderer/utils/koreanHolidays";
import { dateHeadTextClass } from "@renderer/widgets/todo/dateHeadTextClass";
import {
  isChildGroupOpen,
  setChildGroupOpen,
} from "@renderer/features/todo/model/childExpanded";
import { weekdayLabel, type AgendaGroup } from "./agenda";
import MonthAgendaItem from "./MonthAgendaItem";
import type { RefObject } from "react";

export default function MonthAgendaDayGroup({
  year,
  month,
  group,
  todayRef,
  onClickDay,
  foldTick,
  onFold,
}: {
  year: number;
  month: number;
  group: AgendaGroup;
  todayRef: RefObject<HTMLElement | null>;
  onClickDay: (date: number) => void;
  foldTick: number;
  onFold: () => void;
}) {
  const now = new Date();
  const isToday =
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    group.day === now.getDate();
  const headColor = dateHeadTextClass(year, month, group.day);
  const holidayName = koreanPublicHolidayName(year, month, group.day);

  return (
    <section
      ref={isToday ? todayRef : undefined}
      className="flex flex-col gap-2"
    >
      <button
        type="button"
        className="flex items-center gap-2 text-left"
        onClick={() => onClickDay(group.day)}
      >
        <span
          className={cn(
            "text-xs hidden bg-accent text-white px-1.5 py-0.5 rounded-(--radius-btn)",
            isToday && "flex",
          )}
        >
          오늘
        </span>
        <span className={cn("text-lg font-medium", headColor)}>
          {group.day}일
        </span>
        <span className={cn("text-xs", headColor ?? "text-fg-secondary")}>
          {weekdayLabel(year, month, group.day)}
        </span>
        {holidayName ? (
          <span className="text-xs text-danger">· {holidayName}</span>
        ) : null}
      </button>
      {group.blocks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {group.blocks.map((block) => {
            const hasChildren = block.children.length > 0;
            const open = foldTick >= 0 && isChildGroupOpen(block.anchor);
            return (
              <li key={block.item.id} className="flex items-start gap-1">
                {hasChildren ? (
                  <button
                    type="button"
                    className="mt-3 shrink-0 rounded p-0.5 text-fg-secondary hover:bg-muted hover:text-fg"
                    aria-label={open ? "하위 접기" : "하위 펼치기"}
                    aria-expanded={open}
                    onClick={() => {
                      setChildGroupOpen(block.anchor, !open);
                      onFold();
                    }}
                  >
                    <ChevronRightIcon
                      className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
                    />
                  </button>
                ) : (
                  <span className="w-5 shrink-0" aria-hidden />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <ul>
                    <MonthAgendaItem item={block.item} />
                  </ul>
                  {hasChildren && open ? (
                    <ul className="ml-2 flex flex-col gap-1 border-l border-border pl-2">
                      {block.children.map((child) => (
                        <MonthAgendaItem key={child.id} item={child} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-1 py-2 text-sm text-fg-muted">
          등록된 할 일이 없습니다.
        </p>
      )}
    </section>
  );
}
