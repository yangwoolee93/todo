export type HistoryLocation =
  | { kind: "empty" }
  | { kind: "project"; id: string }
  | { kind: "page"; id: string };

export type History = {
  entries: HistoryLocation[];
  index: number;
};

export function sameLocation(a: HistoryLocation, b: HistoryLocation) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "empty" || b.kind === "empty") return true;
  return a.id === b.id;
}

export function visit(history: History, location: HistoryLocation): History {
  const current = history.entries[history.index];
  if (current && sameLocation(current, location)) return history;
  const entries = history.entries.slice(0, history.index + 1);
  entries.push(location);
  return { entries, index: entries.length - 1 };
}

export function syncHistory(
  history: History,
  alive: (location: HistoryLocation) => boolean,
  current: HistoryLocation,
): History {
  const replaced = history.entries.map((entry, index) =>
    index === history.index ? current : entry,
  );
  const entries: HistoryLocation[] = [];
  let index = 0;
  replaced.forEach((entry, entryIndex) => {
    if (entryIndex !== history.index && !alive(entry)) return;
    const previous = entries[entries.length - 1];
    if (previous && sameLocation(previous, entry)) {
      if (entryIndex === history.index) index = entries.length - 1;
      return;
    }
    if (entryIndex === history.index) index = entries.length;
    entries.push(entry);
  });
  if (entries.length === 0) return { entries: [current], index: 0 };
  return { entries, index };
}
