import { BAR_EDGE, BAR_EDGE_RATIO, DAY_COL_WIDTH } from "./constants";
import { DaySummary, DisplayTodo, TodoStatus } from "@shared/types/todo";
import { buildTimelineRows } from "@renderer/features/month/ui/buildTimelineRows";
import { RefObject } from "react";

export type TimelineSegment = {
  start: number;
  days: TodoStatus[];
};

export type TimelineBar = {
  id: string;
  label: string;
  segments: TimelineSegment[];
  settled: boolean;
  nested: boolean;
  /** 부모 묶음 키. 접기는 일별 목록과 이 값으로 같이 기억한다. */
  anchor: string;
};

/** 막대가 차지하는 첫날·마지막 날. 하루짜리는 그 칸만 돌아온다. */
export function barBounds(bar: TimelineBar): { start: number; end: number } | null {
  if (bar.segments.length === 0) return null;
  let start = bar.segments[0].start;
  let end = bar.segments[0].start + bar.segments[0].days.length - 1;
  bar.segments.forEach((segment) => {
    start = Math.min(start, segment.start);
    end = Math.max(end, segment.start + segment.days.length - 1);
  });
  return { start, end };
}

/** 띠 칸 너비 — 막대 좌우 여백을 첫날·마지막 날에 반영한다 */
export function dayRailWidth(index: number, count: number) {
  if (count === 1) return `calc(${DAY_COL_WIDTH} - ${BAR_EDGE} - ${BAR_EDGE})`;
  if (index === 0 || index === count - 1)
    return `calc(${DAY_COL_WIDTH} - ${BAR_EDGE})`;
  return DAY_COL_WIDTH;
}

/** 가운데가 비면 이어진 날만 한 조각으로 나눈다 */
function segmentsFromCells(
  startIndex: number,
  cells: { todo: DisplayTodo | null }[],
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let current: TimelineSegment | null = null;

  cells.forEach((cell, offset) => {
    if (!cell.todo) {
      current = null;
      return;
    }
    if (!current) {
      current = { start: startIndex + offset + 1, days: [cell.todo.status] };
      segments.push(current);
      return;
    }
    current.days.push(cell.todo.status);
  });

  return segments;
}

/** 일별 요약을 막대로 변환한다 */
export function barsFromSummaries(summaries: DaySummary[]): TimelineBar[] {
  return buildTimelineRows(summaries)
    .map((row) => ({
      id: row.key,
      label: row.content,
      segments: segmentsFromCells(row.startIndex, row.cells),
      settled: row.isSettled,
      nested: row.nested,
      anchor: row.anchor,
    }))
    .filter((bar) => bar.segments.length > 0);
}

/** 막대 조각 가장자리 px 계산 */
export function segmentEdgePx(
  start: number,
  dayCount: number,
  colWidth: number,
  edge: number,
) {
  return {
    left: (start - 1) * colWidth + edge,
    right: (start + dayCount - 1) * colWidth - edge,
  };
}

/** 뷰포트 중복 계산 */
export function viewOverlap(
  left: number,
  right: number,
  viewLeft: number,
  viewRight: number,
) {
  return Math.max(0, Math.min(right, viewRight) - Math.max(left, viewLeft));
}

/**
 * 막대 제목의 가로 위치를 정한다. 트랙 왼쪽 기준 px.
 * - 자연 위치는 막대 왼쪽. 단 우측 스크롤 끝을 넘기지 않는다
 * - 화면 밖으로 밀리면 화면 안쪽으로 당기거나 민다
 * - 막대에서 떨어지지 않도록 좌우를 묶는다
 */
export function titleLeftInTrack(
  barLeft: number,
  barRight: number,
  titleWidth: number,
  trackWidth: number,
  viewLeft: number,
  viewRight: number,
) {
  let left = Math.min(barLeft, trackWidth - titleWidth);
  if (left + titleWidth > viewRight) left = viewRight - titleWidth;
  if (left < viewLeft) left = viewLeft;
  left = Math.min(left, Math.max(barLeft, barRight - titleWidth));
  left = Math.max(left, barLeft - titleWidth);
  return Math.max(0, Math.min(left, Math.max(0, trackWidth - titleWidth)));
}

export type TimelineRegion = {
  id: string;
  bars: TimelineBar[];
};

const REGION_PAD_PX = 12;

function titlePlacement(
  bar: TimelineBar,
  title: HTMLParagraphElement,
  colWidth: number,
  edge: number,
  track: number,
  viewLeft: number,
  viewRight: number,
) {
  const ranges = bar.segments.map((segment) =>
    segmentEdgePx(segment.start, segment.days.length, colWidth, edge),
  );
  let best = -1;
  let bestOverlap = 0;
  ranges.forEach((range, index) => {
    const overlap = viewOverlap(range.left, range.right, viewLeft, viewRight);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = index;
    }
  });

  const width = title.offsetWidth;
  const visible = best >= 0;
  const home = ranges[visible ? best : 0];
  const left = visible
    ? titleLeftInTrack(home.left, home.right, width, track, viewLeft, viewRight)
    : Math.max(0, Math.min(home.left, track - width));
  return { left, width, visible };
}

/** 뷰포트 스크롤에 맞춰 제목과, 글자를 덮는 영역 너비를 정한다 */
export function updateTitlePositions({
  root,
  headRow,
  dayCount,
  bars,
  titleRefs,
  regions,
  regionRefs,
}: {
  root: HTMLDivElement;
  headRow: HTMLDivElement;
  dayCount: number;
  bars: TimelineBar[];
  titleRefs: RefObject<Map<string, HTMLParagraphElement>>;
  regions?: TimelineRegion[];
  regionRefs?: RefObject<Map<string, HTMLDivElement>>;
}) {
  const track = headRow.offsetWidth;
  if (track === 0) return;

  const colWidth = track / dayCount;
  const edge = colWidth * BAR_EDGE_RATIO;
  const viewLeft = root.scrollLeft;
  const viewRight = viewLeft + root.clientWidth;
  const placed = new Map<string, { left: number; width: number; visible: boolean }>();

  bars.forEach((bar) => {
    const title = titleRefs.current.get(bar.id);
    if (!title || bar.segments.length === 0) return;

    const place = titlePlacement(
      bar,
      title,
      colWidth,
      edge,
      track,
      viewLeft,
      viewRight,
    );
    placed.set(bar.id, place);
    title.style.opacity = place.visible ? "1" : "0";
    title.style.transform = `translateX(${place.left}px)`;
  });

  regions?.forEach((region) => {
    const node = regionRefs?.current.get(region.id);
    if (!node) return;

    let left = track;
    let right = 0;
    region.bars.forEach((bar) => {
      const bounds = barBounds(bar);
      if (bounds) {
        left = Math.min(left, (bounds.start - 1) * colWidth - REGION_PAD_PX);
        right = Math.max(right, bounds.end * colWidth + REGION_PAD_PX);
      }
      const place = placed.get(bar.id);
      if (!place || !place.visible || place.width <= 0) return;
      left = Math.min(left, place.left - REGION_PAD_PX);
      right = Math.max(right, place.left + place.width + REGION_PAD_PX);
    });

    left = Math.max(0, left);
    right = Math.min(track, right);
    node.style.left = `${left}px`;
    node.style.width = `${Math.max(0, right - left)}px`;
  });
}
