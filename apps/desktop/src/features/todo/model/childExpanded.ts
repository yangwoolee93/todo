const KEY = "orbit-todo-expanded";

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

/** 접지 않은 적이 없으면 펼친 상태다. */
export function isChildGroupOpen(groupKey: string): boolean {
  return readMap()[groupKey] !== false;
}

export function setChildGroupOpen(groupKey: string, open: boolean) {
  const next = readMap();
  next[groupKey] = open;
  localStorage.setItem(KEY, JSON.stringify(next));
}
