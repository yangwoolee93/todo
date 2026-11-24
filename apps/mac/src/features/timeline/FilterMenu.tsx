import { CaretUpIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { GlassButton } from "../../components/GlassButton";
import { useIconScale } from "../../hooks/useIconScale";
import type { TodoStatusDef } from "../../stores/useTimelineStore";
import { cn } from "../../utils/cn";
import type { SortDir, SortKey, TimelineView } from "./view";

export function FilterMenu({
  catalog,
  view,
  onChange,
}: {
  catalog: TodoStatusDef[];
  view: TimelineView;
  onChange: (view: TimelineView) => void;
}) {
  const icon = useIconScale();
  const [open, setOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [picked, setPicked] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const used = new Set(view.sorts.map((rule) => rule.key));
  const draftKey: SortKey = used.has(sortKey) ? (sortKey === "start" ? "end" : "start") : sortKey;
  const active = view.sorts.length > 0 || view.filters.length > 0;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const registerSort = () => {
    if (used.has(draftKey)) return;
    onChange({
      ...view,
      sorts: [
        ...view.sorts,
        { id: crypto.randomUUID(), key: draftKey, dir: sortDir },
      ],
    });
  };

  const registerFilter = () => {
    const statuses = catalog.map((status) => status.id).filter((id) => picked.includes(id));
    if (statuses.length === 0) return;
    onChange({
      ...view,
      filters: [...view.filters, { id: crypto.randomUUID(), statuses }],
    });
    setPicked([]);
  };

  return (
    <div ref={rootRef} data-opens-detail className="relative">
      <GlassButton
        aria-label="필터"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-pressed={active}
        className={cn("pad-sm text-sm", active && "bg-fg/10")}
        onClick={() => setOpen((value) => !value)}
      >
        필터
      </GlassButton>
      {open && (
        <div
          role="dialog"
          aria-label="필터"
          className="absolute top-full right-0 z-30 mt-2 max-h-80 w-96 overflow-y-auto rounded-xl border border-border bg-surface p-2 text-sm"
        >
          <p className="text-xs text-fg-secondary">정렬</p>
          {view.sorts.length > 1 && (
            <p className="mt-1 text-xs text-fg-muted">위에 있을수록 먼저 적용됩니다.</p>
          )}
          {view.sorts.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {view.sorts.map((rule, index) => {
                const label = rule.key === "start" ? "시작일" : "종료일";
                return (
                  <li key={rule.id} className="flex items-center gap-1">
                    <span className="w-4 shrink-0 text-xs text-fg-muted">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                    <DirButton
                      pressed={rule.dir === "asc"}
                      onClick={() =>
                        onChange({
                          ...view,
                          sorts: view.sorts.map((item) =>
                            item.id === rule.id ? { ...item, dir: "asc" } : item,
                          ),
                        })
                      }
                    >
                      정순
                    </DirButton>
                    <DirButton
                      pressed={rule.dir === "desc"}
                      onClick={() =>
                        onChange({
                          ...view,
                          sorts: view.sorts.map((item) =>
                            item.id === rule.id ? { ...item, dir: "desc" } : item,
                          ),
                        })
                      }
                    >
                      역순
                    </DirButton>
                    {index > 0 && (
                      <button
                        type="button"
                        aria-label={`${label} 정렬 위로`}
                        className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
                        onClick={() => {
                          const sorts = [...view.sorts];
                          const [item] = sorts.splice(index, 1);
                          if (!item) return;
                          sorts.splice(index - 1, 0, item);
                          onChange({ ...view, sorts });
                        }}
                      >
                        <CaretUpIcon aria-hidden="true" size={icon(12)} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`${label} 정렬 삭제`}
                      className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
                      onClick={() =>
                        onChange({
                          ...view,
                          sorts: view.sorts.filter((item) => item.id !== rule.id),
                        })
                      }
                    >
                      <XIcon aria-hidden="true" size={icon(12)} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {used.size < 2 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <DirButton pressed={draftKey === "start"} disabled={used.has("start")} onClick={() => setSortKey("start")}>
                시작일
              </DirButton>
              <DirButton pressed={draftKey === "end"} disabled={used.has("end")} onClick={() => setSortKey("end")}>
                종료일
              </DirButton>
              <DirButton pressed={sortDir === "asc"} onClick={() => setSortDir("asc")}>
                정순
              </DirButton>
              <DirButton pressed={sortDir === "desc"} onClick={() => setSortDir("desc")}>
                역순
              </DirButton>
              <button
                type="button"
                className="rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
                onClick={registerSort}
              >
                등록
              </button>
            </div>
          )}

          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-fg-secondary">필터</p>
            {view.filters.length > 1 && (
              <div className="mt-2 flex gap-1">
                <DirButton pressed={view.join === "or"} onClick={() => onChange({ ...view, join: "or" })}>
                  또는
                </DirButton>
                <DirButton pressed={view.join === "and"} onClick={() => onChange({ ...view, join: "and" })}>
                  그리고
                </DirButton>
              </div>
            )}
            {view.filters.length > 1 && (
              <p className="mt-1 text-xs text-fg-muted">
                또는은 하나라도, 그리고는 고른 상태가 모두 있을 때 보여 줍니다.
              </p>
            )}
            {view.filters.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {view.filters.map((rule) => (
                  <li key={rule.id} className="flex items-start gap-1">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                      {rule.statuses.map((id) => {
                        const status = catalog.find((item) => item.id === id);
                        if (!status) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full pad-xs text-xs"
                            style={{ backgroundColor: status.color, color: ink(status.color) }}
                          >
                            {status.name}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      aria-label="필터 삭제"
                      className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
                      onClick={() =>
                        onChange({
                          ...view,
                          filters: view.filters.filter((item) => item.id !== rule.id),
                        })
                      }
                    >
                      <XIcon aria-hidden="true" size={icon(12)} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {catalog.map((status) => (
                <StatusPick
                  key={status.id}
                  name={status.name}
                  color={status.color}
                  pressed={picked.includes(status.id)}
                  onClick={() =>
                    setPicked((current) =>
                      current.includes(status.id)
                        ? current.filter((id) => id !== status.id)
                        : [...current, status.id],
                    )
                  }
                />
              ))}
            </div>
            <button
              type="button"
              disabled={picked.length === 0}
              className="mt-2 rounded-full pad-xs text-xs text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
              onClick={registerFilter}
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DirButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "rounded-full pad-xs text-xs",
        pressed ? "bg-fg/10 text-fg" : "text-fg-secondary hover:bg-fg/10",
        disabled && "pointer-events-none opacity-40",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPick({
  name,
  color,
  pressed,
  onClick,
}: {
  name: string;
  color: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-1 rounded-full pad-xs text-xs",
        !pressed && "text-fg-secondary hover:bg-fg/10",
      )}
      style={pressed ? { backgroundColor: color, color: ink(color) } : undefined}
      onClick={onClick}
    >
      {!pressed && (
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {name}
    </button>
  );
}

function ink(color: string) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#1c1917";
  const value = Number.parseInt(hex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return red * 299 + green * 587 + blue * 114 > 160000 ? "#1c1917" : "#ffffff";
}
