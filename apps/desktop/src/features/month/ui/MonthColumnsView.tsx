import { useEffect, useRef } from "react";
import { getTodoTextClass } from "@renderer/features/todo";
import { cn } from "@renderer/utils/cn";
import { Button } from "@renderer/shared/ui";
import type { MonthDayViewProps } from "./monthViewTypes";
import { onDayActivateKey } from "./onDayActivateKey";

/** 월별 — 가로 day 열 (기존 보기) */
export default function MonthColumnsView({
  summaries,
  today,
  selectedDate,
  onDateClick,
  onGoToDate,
  scrollToTodayTick,
}: MonthDayViewProps) {
  const todayColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (summaries.length === 0) return;
    todayColumnRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [summaries]);

  useEffect(() => {
    if (scrollToTodayTick === 0) return;
    todayColumnRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [scrollToTodayTick, summaries]);

  return (
    <div className="scrollbar flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
      {summaries.map((column) => {
        const isTodayColumn = column.date === today;
        const isSelected = selectedDate === column.date;

        return (
          <div
            key={column.date}
            ref={isTodayColumn ? todayColumnRef : undefined}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${column.day}일`}
            onClick={() => onDateClick(column.date)}
            onKeyDown={(event) => onDayActivateKey(event, column.date, onDateClick)}
            className={cn(
              "relative flex w-44 min-w-44 shrink-0 cursor-pointer flex-col",
              "rounded-(--radius-card) overflow-hidden border bg-surface transition-colors hover:bg-muted/20",
              isTodayColumn && !isSelected && "border-fg-secondary",
              !isTodayColumn && !isSelected && "border-border",
              isSelected && "border-accent",
            )}
          >
            <div
              className={cn(
                "border-b px-2 py-2 text-center text-sm font-semibold",
                "border-border text-fg",
                isTodayColumn && "font-semibold",
                isTodayColumn && !isSelected && "bg-muted",
                isSelected && "bg-accent/15 text-accent",
              )}
            >
              {column.day}일
            </div>

            <ul className="scrollbar flex flex-col flex-1 gap-1 overflow-y-auto p-2">
              {column.todos.length === 0 ? (
                <li className="py-4 text-center text-xs text-fg-muted">—</li>
              ) : (
                column.todos.map((todo) => (
                  <li
                    key={`${column.date}-${todo.id}`}
                    className={`rounded px-1.5 py-1 text-xs leading-snug ${getTodoTextClass(todo.status)}`}
                  >
                    {todo.content}
                  </li>
                ))
              )}
            </ul>

            {isSelected && (
              <div className="absolute bottom-0 right-0 m-2 flex shrink-0 items-center justify-end rounded-md">
                <Button
                  variant="primary"
                  className="py-1 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    onGoToDate(column.date);
                  }}
                >
                  이동
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
