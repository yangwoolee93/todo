const KEY = "arc-timeline-open";

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isSeriesOpen(seriesId: string) {
  return readMap()[seriesId] !== false;
}

export function setSeriesOpen(seriesId: string, open: boolean) {
  const next = readMap();
  next[seriesId] = open;
  localStorage.setItem(KEY, JSON.stringify(next));
}
