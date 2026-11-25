import { CaretRightIcon } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useIconScale } from "../../hooks/useIconScale";
import type { TodoStatusDef } from "../../stores/useTimelineStore";
import { cn } from "../../utils/cn";
import { barBounds, type TimelineBar } from "./bars";
import { isSeriesOpen, setSeriesOpen } from "./fold";
import { connectorPath, placeTitle, railWidth, regionSpan, segmentEdges } from "./follow";
import { compareBars, type SortRule } from "./view";

type BarGroup = { parent: TimelineBar; children: TimelineBar[] };

export type TimelinePreview = {
  start: string;
  end: string;
  parentSeriesId: string | null;
  box: { left: string; width: string };
};

export function TimelineBars({
  bars,
  catalog,
  selectedId,
  scrollRef,
  dayCount,
  sorts,
  preview,
  onOpen,
}: {
  bars: TimelineBar[];
  catalog: TodoStatusDef[];
  selectedId: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  dayCount: number;
  sorts: SortRule[];
  preview: TimelinePreview | null;
  onOpen: (seriesId: string) => void;
}) {
  const [foldTick, setFoldTick] = useState(0);
  const selfRef = useRef<HTMLDivElement>(null);
  const titleRefs = useRef(new Map<string, HTMLParagraphElement>());
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const regionRefs = useRef(new Map<string, HTMLDivElement>());
  const groupRefs = useRef(new Map<string, HTMLDivElement>());
  const connectorRefs = useRef(new Map<string, SVGPathElement>());
  const groups = groupBars(bars);

  useLayoutEffect(() => {
    let cancelled = false;
    let stop = () => {};
    const start = () => {
      if (cancelled) return;
      const root =
        scrollRef.current ??
        selfRef.current?.closest<HTMLElement>("[data-timeline-scroll]") ??
        null;
      if (!root) return;
      stop();
      const update = () => {
        const colWidth =
          root.querySelector<HTMLElement>("[data-day]")?.getBoundingClientRect().width ?? 0;
        if (colWidth <= 0 || dayCount <= 0) return;
        const track = colWidth * dayCount;
        const viewLeft = root.scrollLeft;
        const viewRight = viewLeft + root.clientWidth;
        const edge = colWidth * (0.25 / 4);
        const placed = new Map<string, ReturnType<typeof placeTitle>>();

        for (const bar of groups.flatMap((group) => visibleBars(group))) {
          const title = titleRefs.current.get(bar.seriesId);
          if (!title || bar.segments.length === 0) continue;
          const ranges = bar.segments.map((segment) =>
            segmentEdges(segment.start, segment.todos.length, colWidth),
          );
          const place = placeTitle(ranges, title.offsetWidth, track, viewLeft, viewRight);
          placed.set(bar.seriesId, place);
          title.style.opacity = place.visible ? "1" : "0";
          title.style.transform = `translateX(${place.left}px)`;
        }

        for (const group of groups) {
          const shown = visibleBars(group);
          const region = regionRefs.current.get(group.parent.seriesId);
          if (region && group.children.length > 0) {
            const box = regionSpan(
              shown.flatMap((bar) => {
                const bounds = barBounds(bar);
                return bounds ? [bounds] : [];
              }),
              shown.flatMap((bar) => {
                const place = placed.get(bar.seriesId);
                return place ? [place] : [];
              }),
              track,
              colWidth,
            );
            region.style.left = `${box.left}px`;
            region.style.width = `${box.width}px`;
          }

          const pathNode = connectorRefs.current.get(group.parent.seriesId);
          const groupNode = groupRefs.current.get(group.parent.seriesId);
          const parentRow = rowRefs.current.get(group.parent.seriesId);
          const parentBounds = barBounds(group.parent);
          const open = group.children.length > 0 && isSeriesOpen(group.parent.seriesId);
          if (!pathNode || !groupNode || !parentRow || !parentBounds || !open) {
            if (pathNode) pathNode.setAttribute("d", "");
            continue;
          }
          const groupTop = groupNode.getBoundingClientRect().top;
          const parentRect = parentRow.getBoundingClientRect();
          const parentMid = parentRect.top + parentRect.height / 2 - groupTop;
          const parentLeft = parentBounds.start * colWidth + edge;
          const trunkX = Math.max(4, parentLeft - 10);
          const joints = group.children.flatMap((child) => {
            const row = rowRefs.current.get(child.seriesId);
            const start = child.segments[0]?.start;
            if (!row || start === undefined) return [];
            const rect = row.getBoundingClientRect();
            return [
              {
                mid: rect.top + rect.height / 2 - groupTop,
                childLeft: start * colWidth + edge,
              },
            ];
          });
          pathNode.setAttribute("d", joints.length ? connectorPath(trunkX, parentMid, joints) : "");
        }
      };
      update();
      root.addEventListener("scroll", update, { passive: true });
      const observer = new ResizeObserver(update);
      observer.observe(root);
      const column = root.querySelector("[data-day]");
      if (column) observer.observe(column);
      stop = () => {
        root.removeEventListener("scroll", update);
        observer.disconnect();
      };
    };
    start();
    queueMicrotask(start);
    const frame = requestAnimationFrame(start);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stop();
    };
  }, [bars, dayCount, foldTick, groups, scrollRef]);

  const childTarget = Boolean(
    preview?.parentSeriesId &&
      groups.some((group) => group.parent.seriesId === preview.parentSeriesId),
  );
  const rootPreview = preview && !childTarget ? preview : null;
  const rootSlot = rootPreview ? insertSlot(groups.map((group) => group.parent), rootPreview, sorts) : -1;

  return (
    <div ref={selfRef} className="pointer-events-none relative flex flex-col gap-2 py-2">
      {groups.map((group, index) => {
        const hasChildren = group.children.length > 0;
        const open = foldTick >= 0 && isSeriesOpen(group.parent.seriesId);
        const childPreview = preview && preview.parentSeriesId === group.parent.seriesId ? preview : null;
        const childSlot = childPreview ? insertSlot(group.children, childPreview, sorts) : -1;
        return (
          <div key={group.parent.seriesId} className="contents">
          {rootPreview && rootSlot === index && <PreviewBar box={rootPreview.box} />}
          <div
            ref={(node) => keep(groupRefs.current, group.parent.seriesId, node)}
            className={cn("relative flex flex-col gap-1", hasChildren && "py-1")}
          >
            {hasChildren && (
              <div
                aria-hidden="true"
                ref={(node) => keep(regionRefs.current, group.parent.seriesId, node)}
                className="pointer-events-none absolute top-0 bottom-0 rounded-lg bg-muted/50"
              />
            )}
            {hasChildren && open && (
              <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                <path
                  ref={(node) => keep(connectorRefs.current, group.parent.seriesId, node)}
                  fill="none"
                  stroke="var(--color-fg-secondary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <BarRow
              bar={group.parent}
              catalog={catalog}
              active={group.parent.seriesId === selectedId}
              dayCount={dayCount}
              fold={
                hasChildren
                  ? {
                      open,
                      onToggle: () => {
                        setSeriesOpen(group.parent.seriesId, !open);
                        setFoldTick((value) => value + 1);
                      },
                    }
                  : undefined
              }
              onOpen={onOpen}
              titleRef={(node) => keep(titleRefs.current, group.parent.seriesId, node)}
              rowRef={(node) => keep(rowRefs.current, group.parent.seriesId, node)}
            />
            {childPreview && (!hasChildren || !open) && <PreviewBar box={childPreview.box} />}
            {hasChildren && open && (
              <div className="relative flex flex-col gap-1">
                {group.children.map((child, childIndex) => (
                  <div key={child.seriesId} className="flex flex-col gap-1">
                    {childPreview && childSlot === childIndex && (
                      <PreviewBar box={childPreview.box} />
                    )}
                    <BarRow
                      bar={child}
                      catalog={catalog}
                      active={child.seriesId === selectedId}
                      dayCount={dayCount}
                      nested
                      onOpen={onOpen}
                      titleRef={(node) => keep(titleRefs.current, child.seriesId, node)}
                      rowRef={(node) => keep(rowRefs.current, child.seriesId, node)}
                    />
                  </div>
                ))}
                {childPreview && childSlot === group.children.length && (
                  <PreviewBar box={childPreview.box} />
                )}
              </div>
            )}
          </div>
          </div>
        );
      })}
      {rootPreview && rootSlot === groups.length && <PreviewBar box={rootPreview.box} />}
    </div>
  );
}

function PreviewBar({ box }: { box: { left: string; width: string } }) {
  return (
    <div aria-hidden="true" className="pointer-events-none relative z-10 h-9">
      <div
        className="h-full rounded-lg border border-dashed border-accent bg-accent/20"
        style={{ marginLeft: box.left, width: box.width }}
      />
    </div>
  );
}

function insertSlot(bars: TimelineBar[], preview: TimelinePreview, sorts: SortRule[]) {
  const probe = {
    title: "",
    firstDate: preview.start,
    lastDate: preview.end,
    sortOrder: Number.POSITIVE_INFINITY,
    seriesId: "\uffff",
  };
  const index = bars.findIndex((bar) => compareBars(probe, bar, sorts) < 0);
  return index < 0 ? bars.length : index;
}

function BarRow({
  bar,
  catalog,
  active,
  dayCount,
  nested,
  fold,
  onOpen,
  titleRef,
  rowRef,
}: {
  bar: TimelineBar;
  catalog: TodoStatusDef[];
  active: boolean;
  dayCount: number;
  nested?: boolean;
  fold?: { open: boolean; onToggle: () => void };
  onOpen: (seriesId: string) => void;
  titleRef: (node: HTMLParagraphElement | null) => void;
  rowRef: (node: HTMLDivElement | null) => void;
}) {
  const icon = useIconScale();
  return (
    <div ref={rowRef} className="relative z-10 flex" style={{ width: `${dayCount * 4}rem` }}>
      {bar.segments.map((segment, segmentIndex) => {
        const previous = bar.segments[segmentIndex - 1];
        const gapDays = previous ? segment.start - previous.start - previous.todos.length : 0;
        return (
          <div
            key={`${bar.seriesId}-${segment.start}`}
            role="button"
            tabIndex={0}
            data-opens-detail
            aria-label={bar.title}
            className={cn(
              "pointer-events-auto relative flex shrink-0 cursor-pointer flex-col justify-center gap-1 overflow-visible rounded-lg bg-surface py-2 text-left",
              active && "ring-1 ring-accent",
            )}
            style={{
              marginLeft:
                segmentIndex === 0
                  ? `calc(${segment.start} * 4rem + 0.25rem)`
                  : `calc(${gapDays} * 4rem + 0.5rem)`,
              width: `calc(${segment.todos.length} * 4rem - 0.5rem)`,
            }}
            onClick={() => onOpen(bar.seriesId)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onOpen(bar.seriesId);
            }}
          >
            {fold && segmentIndex === 0 && (
              <button
                type="button"
                data-opens-detail
                className="absolute top-1/2 left-1 z-10 -translate-y-1/2 rounded p-0.5 text-fg-secondary hover:bg-fg/10 hover:text-fg"
                aria-label={fold.open ? "하위 접기" : "하위 펼치기"}
                aria-expanded={fold.open}
                onClick={(event) => {
                  event.stopPropagation();
                  fold.onToggle();
                }}
              >
                <CaretRightIcon
                  aria-hidden="true"
                  className={cn("transition-transform", fold.open && "rotate-90")}
                  size={icon(16)}
                />
              </button>
            )}
            <p className="invisible px-3 text-sm font-medium leading-snug">&nbsp;</p>
            <div className="flex h-1 w-full" aria-hidden="true">
              {segment.todos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="flex h-full items-center px-px"
                  style={{ width: railWidth(index, segment.todos.length) }}
                >
                  <span
                    className="h-0.75 w-full rounded-full"
                    style={{ backgroundColor: statusColor(catalog, todo.status) }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-1 overflow-visible py-2">
        <p
          ref={titleRef}
          className={cn(
            "w-max self-start pr-3 text-sm font-medium leading-snug",
            nested || fold ? "pl-8" : "px-3",
            bar.settled ? "text-fg-muted" : "text-fg",
          )}
        >
          <span className="whitespace-nowrap">{bar.title}</span>
        </p>
        <div className="h-1" aria-hidden="true" />
      </div>
    </div>
  );
}

function groupBars(bars: TimelineBar[]): BarGroup[] {
  const byId = new Map(bars.map((bar) => [bar.seriesId, bar]));
  const childrenOf = new Map<string, TimelineBar[]>();
  const roots: TimelineBar[] = [];
  for (const bar of bars) {
    const parent = bar.parentSeriesId ? byId.get(bar.parentSeriesId) : undefined;
    if (!parent) {
      roots.push(bar);
      continue;
    }
    const list = childrenOf.get(parent.seriesId) ?? [];
    list.push(bar);
    childrenOf.set(parent.seriesId, list);
  }
  return roots.map((parent) => ({
    parent,
    children: childrenOf.get(parent.seriesId) ?? [],
  }));
}

function visibleBars(group: BarGroup) {
  if (group.children.length === 0 || !isSeriesOpen(group.parent.seriesId)) return [group.parent];
  return [group.parent, ...group.children];
}

function keep<T>(map: Map<string, T>, id: string, node: T | null) {
  if (node) map.set(id, node);
  else map.delete(id);
}

function statusColor(catalog: TodoStatusDef[], status: string) {
  return catalog.find((item) => item.id === status)?.color ?? catalog[0]?.color ?? "#a8a29e";
}
