const COLUMN_REM = 4;
const EDGE_REM = 0.25;
const REGION_PAD_REM = 0.75;

export function railWidth(index: number, count: number) {
  if (count <= 1) return `calc(${COLUMN_REM}rem - ${EDGE_REM}rem - ${EDGE_REM}rem)`;
  if (index === 0 || index === count - 1) return `calc(${COLUMN_REM}rem - ${EDGE_REM}rem)`;
  return `${COLUMN_REM}rem`;
}

export function segmentEdges(start: number, count: number, colWidth: number) {
  const edge = colWidth * (EDGE_REM / COLUMN_REM);
  return {
    left: start * colWidth + edge,
    right: (start + count) * colWidth - edge,
  };
}

export type PlacedTitle = { left: number; width: number; visible: boolean };

export function placeTitle(
  ranges: { left: number; right: number }[],
  titleWidth: number,
  track: number,
  viewLeft: number,
  viewRight: number,
): PlacedTitle {
  let best = -1;
  let bestOverlap = 0;
  ranges.forEach((range, index) => {
    const overlap = Math.max(0, Math.min(range.right, viewRight) - Math.max(range.left, viewLeft));
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = index;
    }
  });
  const visible = best >= 0;
  const home = ranges[visible ? best : 0] ?? { left: 0, right: 0 };
  const left = visible
    ? titleLeft(home.left, home.right, titleWidth, track, viewLeft, viewRight)
    : Math.max(0, Math.min(home.left, Math.max(0, track - titleWidth)));
  return { left, width: titleWidth, visible };
}

function titleLeft(
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

export function regionSpan(
  bounds: { start: number; end: number }[],
  titles: PlacedTitle[],
  track: number,
  colWidth: number,
) {
  const pad = colWidth * (REGION_PAD_REM / COLUMN_REM);
  let left = track;
  let right = 0;
  for (const bound of bounds) {
    left = Math.min(left, bound.start * colWidth - pad);
    right = Math.max(right, (bound.end + 1) * colWidth + pad);
  }
  for (const title of titles) {
    if (!title.visible || title.width <= 0) continue;
    left = Math.min(left, title.left - pad);
    right = Math.max(right, title.left + title.width + pad);
  }
  left = Math.max(0, left);
  right = Math.min(track, right);
  return { left, width: Math.max(0, right - left) };
}

export function connectorPath(
  trunkX: number,
  parentMid: number,
  children: { mid: number; childLeft: number }[],
) {
  const radius = 6;
  let path = "";
  children.forEach((child, index) => {
    const fromY = index === 0 ? parentMid : (children[index - 1]?.mid ?? parentMid);
    const turnX = trunkX + radius;
    const endX = Math.max(turnX + 4, child.childLeft - 2);
    const turnY = Math.max(fromY + radius, child.mid);
    path += `M ${trunkX} ${fromY} V ${turnY - radius} Q ${trunkX} ${turnY} ${turnX} ${turnY} H ${endX} `;
  });
  return path;
}
