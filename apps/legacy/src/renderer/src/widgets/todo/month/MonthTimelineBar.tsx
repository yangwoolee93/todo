import { cn } from "@renderer/utils/cn";
import { BAR_EDGE, DAY_COL_WIDTH } from "./constants";
import { dayRailWidth, TimelineBar } from "./monthTimelineTempUtil";
import { RefObject } from "react";

export default function MonthTimelineBar({
  bar,
  trackWidth,
  titleRefs,
}: {
  bar: TimelineBar;
  trackWidth: string;
  titleRefs: RefObject<Map<string, HTMLParagraphElement>>;
}) {
  return (
    <div key={bar.id} className="relative flex" style={{ width: trackWidth }}>
      {bar.segments.map((segment, segmentIndex) => {
        const prev = bar.segments[segmentIndex - 1];
        const gapDays = prev ? segment.start - prev.start - prev.days.length : 0;
        return (
          <div
            key={`${bar.id}-${segment.start}`}
            className="relative flex shrink-0 flex-col justify-center gap-1 overflow-visible rounded-(--radius-card) bg-surface py-2"
            style={{
              marginLeft:
                segmentIndex === 0
                  ? `calc(${segment.start - 1} * ${DAY_COL_WIDTH} + ${BAR_EDGE})`
                  : `calc(${gapDays} * ${DAY_COL_WIDTH} + ${BAR_EDGE} + ${BAR_EDGE})`,
              width: `calc(${segment.days.length} * ${DAY_COL_WIDTH} - ${BAR_EDGE} - ${BAR_EDGE})`,
            }}
          >
            <p className="invisible px-3 font-medium leading-snug">&nbsp;</p>
            <div className="flex h-1 w-full" aria-hidden>
              {segment.days.map((status, index) => (
                <div
                  key={index}
                  className="flex h-full items-center px-px"
                  style={{ width: dayRailWidth(index, segment.days.length) }}
                >
                  <span
                    className={cn(
                      "h-0.75 w-full rounded-full",
                      "bg-fg-muted/50",
                      status === "completed" && "bg-success",
                      status === "failed" && "bg-failed",
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-1 overflow-visible py-2">
        <p
          ref={(node) => {
            if (node) titleRefs.current.set(bar.id, node);
            else titleRefs.current.delete(bar.id);
          }}
          className={cn(
            "w-max self-start px-3 font-medium leading-snug",
            bar.settled ? "text-fg-muted" : "text-fg",
          )}
        >
          <span className="whitespace-nowrap">{bar.label}</span>
        </p>
        <div className="h-1" aria-hidden />
      </div>
    </div>
  );
}
