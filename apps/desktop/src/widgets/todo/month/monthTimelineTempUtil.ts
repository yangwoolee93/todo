import { isKoreanPublicHoliday } from "@renderer/utils/koreanHolidays";
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
};

/** 날짜 헤드 텍스트 색상 정하기 */
export function dateHeadTextClass(year: number, month: number, day: number) {
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || isKoreanPublicHoliday(year, month, day)) return "text-danger";
  if (weekday === 6) return "text-accent";
  return undefined;
}

/** 띠 칸 너비 — 막대 좌우 여백을 첫날·마지막 날에 반영한다 */
export function dayRailWidth(index: number, count: number) {
  if (count === 1) return `calc(${DAY_COL_WIDTH} - ${BAR_EDGE} - ${BAR_EDGE})`;
  if (index === 0 || index === count - 1) return `calc(${DAY_COL_WIDTH} - ${BAR_EDGE})`;
  return DAY_COL_WIDTH;
}

/** 자식 요소를 뷰포트 중앙에 스크롤한다 */
export function scrollChildIntoView(
  root: HTMLElement | null,
  target: HTMLElement | null,
  axis: "x" | "y",
  behavior: ScrollBehavior = "auto",
) {
  if (!root || !target) return;

  const rootRect = root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  if (axis === "x") {
    const left =
      root.scrollLeft +
      (targetRect.left - rootRect.left - root.clientWidth / 2 + targetRect.width / 2);
    root.scrollTo({ left, behavior });
    return;
  }

  const top =
    root.scrollTop +
    (targetRect.top - rootRect.top - root.clientHeight / 2 + targetRect.height / 2);
  root.scrollTo({ top, behavior });
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
    }))
    .filter((bar) => bar.segments.length > 0);
}

/** 연월 키 생성 */
export function toYearMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 막대 조각 가장자리 px 계산 */
export function segmentEdgePx(start: number, dayCount: number, colWidth: number, edge: number) {
  return {
    left: (start - 1) * colWidth + edge,
    right: (start + dayCount - 1) * colWidth - edge,
  };
}

/** 뷰포트 중복 계산 */
export function viewOverlap(left: number, right: number, viewLeft: number, viewRight: number) {
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

/** 뷰포트 스크롤에 맞춰 제목 위치와 표시 여부를 정한다 */
export function updateTitlePositions({
  root,
  headRow,
  dayCount,
  bars,
  titleRefs,
}: {
  root: HTMLDivElement;
  headRow: HTMLDivElement;
  dayCount: number;
  bars: TimelineBar[];
  titleRefs: RefObject<Map<string, HTMLParagraphElement>>;
}) {
  const track = headRow.offsetWidth;
  if (track === 0) return;

  const colWidth = track / dayCount;
  const edge = colWidth * BAR_EDGE_RATIO;
  const viewLeft = root.scrollLeft;
  const viewRight = viewLeft + root.clientWidth;

  bars.forEach((bar) => {
    const title = titleRefs.current.get(bar.id);
    if (!title || bar.segments.length === 0) return;

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

    const titleWidth = title.offsetWidth;
    const visible = best >= 0;
    const home = ranges[visible ? best : 0];
    // 감출 때도 트랙 안에 세워 둔다. 안 그러면 가로 스크롤이 트랙보다 길어진다
    const left = visible
      ? titleLeftInTrack(home.left, home.right, titleWidth, track, viewLeft, viewRight)
      : Math.max(0, Math.min(home.left, track - titleWidth));

    title.style.opacity = visible ? "1" : "0";
    title.style.transform = `translateX(${left}px)`;
  });
}
