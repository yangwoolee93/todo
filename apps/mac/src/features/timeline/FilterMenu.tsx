import { CaretDownIcon, CaretUpIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GlassButton } from "../../components/GlassButton";
import { useIconScale } from "../../hooks/useIconScale";
import type { TodoStatusDef } from "../../stores/useTimelineStore";
import { cn } from "../../utils/cn";
import type {
  FilterOp,
  FilterProperty,
  FilterRule,
  SortDir,
  SortKey,
  SortRule,
  TimelineView,
} from "./view";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "start", label: "시작일" },
  { id: "end", label: "종료일" },
  { id: "title", label: "제목" },
];

const PROPERTIES: { id: FilterProperty; label: string }[] = [
  { id: "status", label: "상태" },
  { id: "tag", label: "태그" },
  { id: "title", label: "제목" },
];

const STATUS_OPS: { id: FilterOp; label: string }[] = [
  { id: "is", label: "이다" },
  { id: "isNot", label: "아니다" },
];

const TEXT_OPS: { id: FilterOp; label: string }[] = [
  { id: "contains", label: "포함한다" },
  { id: "notContains", label: "포함하지 않는다" },
];

type Editor =
  | { kind: "add-view" }
  | { kind: "view-menu"; id: string }
  | { kind: "rename-view"; id: string }
  | { kind: "add-sort"; anchor: "button" | "plus" }
  | { kind: "add-filter"; anchor: "button" | "plus" }
  | { kind: "sort"; id: string }
  | { kind: "filter"; id: string }
  | { kind: "advanced" }
  | { kind: "bars" };

function viewLabel(item: TimelineView, pageTitle: string) {
  return item.name.trim() || pageTitle.trim() || "케이던스";
}

export function ViewToolbar({
  catalog,
  tags,
  views,
  pageTitle,
  view,
  onChange,
  onSelect,
  onCreate,
  onRename,
  onRemove,
  children,
}: {
  catalog: TodoStatusDef[];
  tags: string[];
  views: TimelineView[];
  pageTitle: string;
  view: TimelineView;
  onChange: (view: TimelineView) => void;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  children?: ReactNode;
}) {
  const icon = useIconScale();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewIdRef = useRef(view.id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const used = new Set(view.sorts.map((rule) => rule.key));
  const advanced = view.join === "or" && view.filters.length > 1;
  const showRow = view.sorts.length > 0 || view.filters.length > 0 || view.bars.length > 0;
  const filterOn = view.filters.length > 0 || view.bars.length > 0;

  useEffect(() => {
    if (!editor) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setEditor((current) => (current?.kind === "rename-view" ? current : null));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditor(null);
    };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [editor]);

  useEffect(() => {
    if (viewIdRef.current === view.id) return;
    viewIdRef.current = view.id;
    setEditor(null);
  }, [view.id]);

  useEffect(() => {
    if (!editor) return;
    if (editor.kind === "sort" && !view.sorts.some((rule) => rule.id === editor.id)) setEditor(null);
    if (
      editor.kind === "filter" &&
      (advanced || !view.filters.some((rule) => rule.id === editor.id))
    ) {
      setEditor(null);
    }
    if (editor.kind === "advanced" && !advanced) setEditor(null);
  }, [advanced, editor, view.filters, view.sorts]);

  const replaceSorts = (sorts: SortRule[]) => onChange({ ...view, sorts });
  const replaceFilters = (filters: FilterRule[]) => onChange({ ...view, filters });

  const addSort = (key: SortKey) => {
    const id = crypto.randomUUID();
    replaceSorts([...view.sorts, { id, key, dir: "asc" }]);
    setEditor({ kind: "sort", id });
  };

  const addFilter = (property: FilterProperty) => {
    const id = crypto.randomUUID();
    const rule: FilterRule = {
      id,
      property,
      op: property === "status" ? "is" : "contains",
      values: [],
    };
    const joining = view.filters.length > 0 && view.join === "or";
    onChange({
      ...view,
      join: view.filters.length === 0 ? "and" : view.join,
      filters: [...view.filters, rule],
    });
    setEditor(joining ? { kind: "advanced" } : { kind: "filter", id });
  };

  const openSortAdd = (anchor: "button" | "plus") => {
    if (used.size >= SORTS.length) return;
    setEditor((current) =>
      current?.kind === "add-sort" && current.anchor === anchor ? null : { kind: "add-sort", anchor },
    );
  };

  const openFilterAdd = (anchor: "button" | "plus") => {
    setEditor((current) =>
      current?.kind === "add-filter" && current.anchor === anchor
        ? null
        : { kind: "add-filter", anchor },
    );
  };

  return (
    <div ref={rootRef} className="relative z-30 flex flex-col gap-2">
      <div className="flex h-8 items-center gap-2">
        <div data-opens-detail className="flex min-w-0 items-center gap-1">
          <div
            className={cn(
              "flex min-w-0 items-center gap-1",
              editor?.kind === "view-menu" ? "overflow-visible" : "overflow-x-auto",
            )}
          >
            {views.map((item) => {
              const label = viewLabel(item, pageTitle);
              const selected = item.id === view.id;
              const menuOpen = editor?.kind === "view-menu" && editor.id === item.id;
              const renaming = editor?.kind === "rename-view" && editor.id === item.id;
              return (
                <div key={item.id} className="relative shrink-0">
                  {renaming ? (
                    <ViewRenameField
                      label={label}
                      onCommit={(name) => {
                        onRename(item.id, name);
                        setEditor(null);
                      }}
                      onCancel={() => setEditor(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      title={label}
                      className={cn(
                        "max-w-36 truncate rounded-full pad-sm text-sm",
                        selected ? "bg-fg/10 text-fg" : "text-fg-secondary hover:bg-fg/10",
                      )}
                      onClick={() => {
                        if (!selected) {
                          onSelect(item.id);
                          return;
                        }
                        setEditor((current) =>
                          current?.kind === "view-menu" && current.id === item.id
                            ? null
                            : { kind: "view-menu", id: item.id },
                        );
                      }}
                    >
                      {label}
                    </button>
                  )}
                  {menuOpen && (
                    <Popover label="보기 메뉴" align="left" className="w-28 p-1">
                      <button
                        type="button"
                        className="block w-full whitespace-nowrap rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
                        onClick={() => setEditor({ kind: "rename-view", id: item.id })}
                      >
                        이름 변경
                      </button>
                      {views.length > 1 && (
                        <button
                          type="button"
                          className="block w-full whitespace-nowrap rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
                          onClick={() => {
                            onRemove(item.id);
                            setEditor(null);
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </Popover>
                  )}
                </div>
              );
            })}
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="보기 추가"
              aria-expanded={editor?.kind === "add-view"}
              aria-haspopup="dialog"
              className="flex rounded-full p-1 text-fg hover:bg-fg/10"
              onClick={() =>
                setEditor((current) => (current?.kind === "add-view" ? null : { kind: "add-view" }))
              }
            >
              <PlusIcon aria-hidden="true" size={icon(14)} />
            </button>
            {editor?.kind === "add-view" && (
              <Popover label="보기 추가" align="left" className="w-56">
                <ViewNameDraft
                  onCreate={(name) => {
                    onCreate(name);
                    setEditor(null);
                  }}
                />
              </Popover>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">{children}</div>
        <div data-opens-detail className="ml-auto flex shrink-0 items-center gap-2">
          <div className="relative">
            <GlassButton
              aria-label="정렬"
              aria-expanded={editor?.kind === "add-sort" && editor.anchor === "button"}
              aria-haspopup="dialog"
              aria-pressed={view.sorts.length > 0}
              className={cn("pad-sm text-sm", view.sorts.length > 0 && "bg-fg/10")}
              onClick={() => openSortAdd("button")}
            >
              정렬
            </GlassButton>
            {editor?.kind === "add-sort" && editor.anchor === "button" && (
              <SortKeyPicker used={used} align="right" onPick={addSort} />
            )}
          </div>
          <div className="relative">
            <GlassButton
              aria-label="필터"
              aria-expanded={editor?.kind === "add-filter" && editor.anchor === "button"}
              aria-haspopup="dialog"
              aria-pressed={filterOn}
              className={cn("pad-sm text-sm", filterOn && "bg-fg/10")}
              onClick={() => openFilterAdd("button")}
            >
              필터
            </GlassButton>
            {editor?.kind === "add-filter" && editor.anchor === "button" && (
              <Popover label="필터" align="right" className="w-72">
                <PropertyPicker onPick={addFilter} />
                <div className="mt-3 border-t border-border pt-3">
                  <BarsEditor
                    catalog={catalog}
                    bars={view.bars}
                    onChange={(bars) => onChange({ ...view, bars })}
                  />
                </div>
              </Popover>
            )}
            {editor?.kind === "bars" && view.bars.length === 0 && (
              <Popover label="막대" align="right" className="w-72">
                <BarsEditor
                  catalog={catalog}
                  bars={view.bars}
                  onChange={(bars) => onChange({ ...view, bars })}
                />
              </Popover>
            )}
          </div>
        </div>
      </div>
      {showRow && (
        <div data-opens-detail className="flex flex-wrap items-center gap-1">
          {view.sorts.map((rule, index) => (
            <span key={rule.id} className="relative">
              <RuleChip
                label={sortChipLabel(rule)}
                name={sortChipName(rule)}
                empty={false}
                open={editor?.kind === "sort" && editor.id === rule.id}
                onOpen={() =>
                  setEditor((current) =>
                    current?.kind === "sort" && current.id === rule.id
                      ? null
                      : { kind: "sort", id: rule.id },
                  )
                }
                onRemove={() => {
                  replaceSorts(view.sorts.filter((item) => item.id !== rule.id));
                  setEditor((current) =>
                    current?.kind === "sort" && current.id === rule.id ? null : current,
                  );
                }}
              />
              {editor?.kind === "sort" && editor.id === rule.id && (
                <Popover label="정렬" align="left" className="w-72">
                  <SortRuleEditor
                    rule={rule}
                    index={index}
                    count={view.sorts.length}
                    used={used}
                    iconSize={icon(12)}
                    onChange={(next) =>
                      replaceSorts(view.sorts.map((item) => (item.id === rule.id ? next : item)))
                    }
                    onMove={(delta) => {
                      const sorts = [...view.sorts];
                      const [item] = sorts.splice(index, 1);
                      if (!item) return;
                      sorts.splice(index + delta, 0, item);
                      replaceSorts(sorts);
                    }}
                    onDelete={() => replaceSorts(view.sorts.filter((item) => item.id !== rule.id))}
                  />
                </Popover>
              )}
            </span>
          ))}
          {view.sorts.length > 0 && used.size < SORTS.length && (
            <span className="relative">
              <AddChip
                label="정렬 추가"
                open={editor?.kind === "add-sort" && editor.anchor === "plus"}
                onClick={() => openSortAdd("plus")}
              />
              {editor?.kind === "add-sort" && editor.anchor === "plus" && (
                <SortKeyPicker used={used} align="left" onPick={addSort} />
              )}
            </span>
          )}
          {view.filters.length > 1 && (
            <span className="mr-1 inline-flex items-center gap-1">
              <Pick
                pressed={view.join === "and"}
                onClick={() => {
                  onChange({ ...view, join: "and" });
                  setEditor(null);
                }}
              >
                그리고
              </Pick>
              <Pick
                pressed={view.join === "or"}
                onClick={() => {
                  onChange({ ...view, join: "or" });
                  setEditor({ kind: "advanced" });
                }}
              >
                또는
              </Pick>
            </span>
          )}
          {advanced ? (
            <span className="relative">
              <RuleChip
                label={groupChipLabel(view.filters, catalog)}
                name={`또는 필터 ${groupChipLabel(view.filters, catalog)}`}
                empty={!view.filters.some((rule) => rule.values.some((value) => value.trim()))}
                wide
                open={editor?.kind === "advanced"}
                onOpen={() =>
                  setEditor((current) => (current?.kind === "advanced" ? null : { kind: "advanced" }))
                }
                onRemove={() => {
                  replaceFilters([]);
                  setEditor(null);
                }}
              />
              {editor?.kind === "advanced" && (
                <Popover label="또는 필터" align="left" className="w-[28rem]">
                  <p className="mb-2 text-xs text-fg-muted">
                    하나만 맞아도 보여 줍니다.
                  </p>
                  <FilterRuleList
                    catalog={catalog}
                    tags={tags}
                    filters={view.filters}
                    iconSize={icon(12)}
                    onChange={replaceFilters}
                  />
                  <button
                    type="button"
                    className="mt-2 rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
                    onClick={() => addFilter("status")}
                  >
                    필터 추가
                  </button>
                </Popover>
              )}
            </span>
          ) : (
            view.filters.map((rule) => {
              const filled = rule.values.some((value) => value.trim());
              return (
                <span key={rule.id} className="relative">
                  <RuleChip
                    label={filterChipLabel(rule, catalog)}
                    name={filterChipName(rule, catalog)}
                    empty={!filled}
                    open={editor?.kind === "filter" && editor.id === rule.id}
                    onOpen={() =>
                      setEditor((current) =>
                        current?.kind === "filter" && current.id === rule.id
                          ? null
                          : { kind: "filter", id: rule.id },
                      )
                    }
                    onRemove={() => {
                      replaceFilters(view.filters.filter((item) => item.id !== rule.id));
                      setEditor((current) =>
                        current?.kind === "filter" && current.id === rule.id ? null : current,
                      );
                    }}
                  />
                  {editor?.kind === "filter" && editor.id === rule.id && (
                    <Popover label="필터" align="left" className="w-80">
                      <FilterRuleEditor
                        rule={rule}
                        catalog={catalog}
                        tags={tags}
                        iconSize={icon(12)}
                        onChange={(next) =>
                          replaceFilters(view.filters.map((item) => (item.id === rule.id ? next : item)))
                        }
                        onDelete={() => replaceFilters(view.filters.filter((item) => item.id !== rule.id))}
                      />
                    </Popover>
                  )}
                </span>
              );
            })
          )}
          {view.filters.length > 0 && (
            <span className="relative">
              <AddChip
                label="필터 추가"
                open={editor?.kind === "add-filter" && editor.anchor === "plus"}
                onClick={() => openFilterAdd("plus")}
              />
              {editor?.kind === "add-filter" && editor.anchor === "plus" && (
                <Popover label="필터 추가" align="left" className="w-56">
                  <PropertyPicker onPick={addFilter} />
                </Popover>
              )}
            </span>
          )}
          {view.bars.length > 0 && (
            <span className="relative">
              <RuleChip
                label={barChipLabel(view.bars, catalog)}
                name={barChipLabel(view.bars, catalog)}
                empty={false}
                open={editor?.kind === "bars"}
                onOpen={() => setEditor((current) => (current?.kind === "bars" ? null : { kind: "bars" }))}
                onRemove={() => {
                  onChange({ ...view, bars: [] });
                  setEditor((current) => (current?.kind === "bars" ? null : current));
                }}
              />
              {editor?.kind === "bars" && (
                <Popover label="막대" align="left" className="w-72">
                  <BarsEditor
                    catalog={catalog}
                    bars={view.bars}
                    onChange={(bars) => onChange({ ...view, bars })}
                  />
                </Popover>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function sortChipLabel(rule: SortRule) {
  const name = SORTS.find((item) => item.id === rule.key)?.label ?? "시작일";
  return `${rule.dir === "asc" ? "↑" : "↓"} ${name}`;
}

function sortChipName(rule: SortRule) {
  const name = SORTS.find((item) => item.id === rule.key)?.label ?? "시작일";
  return `정렬 ${name} ${rule.dir === "asc" ? "오름차순" : "내림차순"}`;
}

function filterChipLabel(rule: FilterRule, catalog: TodoStatusDef[]) {
  const property = PROPERTIES.find((item) => item.id === rule.property)?.label ?? "상태";
  const values = chipValues(rule, catalog);
  if (values.length === 0) return property;
  const mark = rule.op === "isNot" ? " 아님" : rule.op === "notContains" ? " 제외" : "";
  return `${property}${mark}: ${values.join(", ")}`;
}

function filterChipName(rule: FilterRule, catalog: TodoStatusDef[]) {
  return `필터 ${filterChipLabel(rule, catalog)}`;
}

function chipValues(rule: FilterRule, catalog: TodoStatusDef[]) {
  if (rule.property === "status") {
    return rule.values.map(
      (id) => catalog.find((status) => status.id === id)?.name ?? id,
    );
  }
  return rule.values.map((value) => value.trim()).filter(Boolean);
}

function groupChipLabel(filters: FilterRule[], catalog: TodoStatusDef[]) {
  return filters.map((rule) => filterChipLabel(rule, catalog)).join(" · ");
}

function barChipLabel(bars: string[], catalog: TodoStatusDef[]) {
  const names = bars.map((id) => catalog.find((status) => status.id === id)?.name ?? id);
  return `막대: ${names.join(", ")}`;
}

function RuleChip({
  label,
  name,
  empty,
  wide,
  open,
  onOpen,
  onRemove,
}: {
  label: string;
  name: string;
  empty: boolean;
  wide?: boolean;
  open: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const icon = useIconScale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        wide ? "max-w-80" : "max-w-56",
        empty ? "text-fg-muted ring-1 ring-inset ring-fg/20" : "bg-fg/10 text-fg",
      )}
    >
      <button
        type="button"
        aria-label={name}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="min-w-0 truncate pad-xs text-xs"
        onClick={onOpen}
      >
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`${name} 삭제`}
          className="mr-1 shrink-0 rounded-full p-0.5 hover:bg-fg/10"
          onClick={onRemove}
        >
          <XIcon aria-hidden="true" size={icon(12)} />
        </button>
      )}
    </span>
  );
}

function AddChip({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  const icon = useIconScale();
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-0.5 rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10"
      onClick={onClick}
    >
      <PlusIcon aria-hidden="true" size={icon(12)} />
      추가
    </button>
  );
}

function ViewRenameField({
  label,
  onCommit,
  onCancel,
}: {
  label: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(label);
  const cancelRef = useRef(false);
  const commit = (raw: string) => {
    if (cancelRef.current) {
      cancelRef.current = false;
      onCancel();
      return;
    }
    const next = raw.trim();
    if (!next || next === label) {
      onCancel();
      return;
    }
    onCommit(next);
  };
  return (
    <input
      aria-label="보기 이름"
      value={value}
      autoFocus
      className="w-28 rounded-full bg-fg/10 pad-sm text-sm text-fg outline-none"
      onChange={(event) => setValue(event.target.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          cancelRef.current = true;
          event.currentTarget.blur();
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.blur();
      }}
    />
  );
}

function ViewNameDraft({ onCreate }: { onCreate: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const next = value.trim();
        if (!next) return;
        onCreate(next);
      }}
    >
      <input
        aria-label="보기 이름"
        value={value}
        placeholder="이름"
        autoFocus
        className="min-w-0 flex-1 rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing && event.key === "Enter") event.preventDefault();
        }}
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="shrink-0 rounded-full pad-xs text-xs text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
      >
        추가
      </button>
    </form>
  );
}

function Popover({
  label,
  align,
  className,
  children,
}: {
  label: string;
  align: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className={cn(
        "absolute top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface p-2 text-sm",
        align === "right" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SortKeyPicker({
  used,
  align,
  onPick,
}: {
  used: Set<SortKey>;
  align: "left" | "right";
  onPick: (key: SortKey) => void;
}) {
  return (
    <Popover label="정렬" align={align} className="w-40">
      <div className="flex flex-col gap-1">
        {SORTS.filter((item) => !used.has(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`정렬 추가 ${item.label}`}
            className="rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
            onClick={() => onPick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}

function PropertyPicker({ onPick }: { onPick: (property: FilterProperty) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PROPERTIES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={`필터 추가 ${item.label}`}
          className="rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
          onClick={() => onPick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SortRuleEditor({
  rule,
  index,
  count,
  used,
  iconSize,
  onChange,
  onMove,
  onDelete,
}: {
  rule: SortRule;
  index: number;
  count: number;
  used: Set<SortKey>;
  iconSize: number;
  onChange: (rule: SortRule) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [choice, setChoice] = useState<"key" | "dir" | null>(null);
  return (
    <div>
      {count > 1 && (
        <p className="mb-2 text-xs text-fg-muted">위에 있을수록 먼저 적용됩니다.</p>
      )}
      <div className="flex items-center gap-1">
        <ChoiceButton
          label="정렬 기준"
          open={choice === "key"}
          text={SORTS.find((item) => item.id === rule.key)?.label ?? "시작일"}
          onClick={() => setChoice((current) => (current === "key" ? null : "key"))}
        />
        <ChoiceButton
          label="정렬 방향"
          open={choice === "dir"}
          text={rule.dir === "asc" ? "오름차순" : "내림차순"}
          onClick={() => setChoice((current) => (current === "dir" ? null : "dir"))}
        />
        <button
          type="button"
          aria-label="정렬 위로"
          disabled={index === 0}
          className="ml-auto shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => onMove(-1)}
        >
          <CaretUpIcon aria-hidden="true" size={iconSize} />
        </button>
        <button
          type="button"
          aria-label="정렬 아래로"
          disabled={index === count - 1}
          className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => onMove(1)}
        >
          <CaretDownIcon aria-hidden="true" size={iconSize} />
        </button>
        <button
          type="button"
          aria-label="정렬 삭제"
          className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
          onClick={onDelete}
        >
          <XIcon aria-hidden="true" size={iconSize} />
        </button>
      </div>
      {choice === "key" && (
        <div className="mt-1 flex flex-wrap gap-1">
          {SORTS.filter((item) => item.id === rule.key || !used.has(item.id)).map((item) => (
            <Pick
              key={item.id}
              pressed={item.id === rule.key}
              onClick={() => {
                onChange({ ...rule, key: item.id });
                setChoice(null);
              }}
            >
              {item.label}
            </Pick>
          ))}
        </div>
      )}
      {choice === "dir" && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(["asc", "desc"] as SortDir[]).map((dir) => (
            <Pick
              key={dir}
              pressed={rule.dir === dir}
              onClick={() => {
                onChange({ ...rule, dir });
                setChoice(null);
              }}
            >
              {dir === "asc" ? "오름차순" : "내림차순"}
            </Pick>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRuleList({
  catalog,
  tags,
  filters,
  iconSize,
  onChange,
}: {
  catalog: TodoStatusDef[];
  tags: string[];
  filters: FilterRule[];
  iconSize: number;
  onChange: (filters: FilterRule[]) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {filters.map((rule) => (
        <li key={rule.id} className="rounded-lg bg-fg/5 p-1.5">
          <FilterRuleEditor
            rule={rule}
            catalog={catalog}
            tags={tags}
            iconSize={iconSize}
            onChange={(next) => onChange(filters.map((item) => (item.id === rule.id ? next : item)))}
            onDelete={() => onChange(filters.filter((item) => item.id !== rule.id))}
          />
        </li>
      ))}
    </ul>
  );
}

function FilterRuleEditor({
  rule,
  catalog,
  tags,
  iconSize,
  onChange,
  onDelete,
}: {
  rule: FilterRule;
  catalog: TodoStatusDef[];
  tags: string[];
  iconSize: number;
  onChange: (rule: FilterRule) => void;
  onDelete: () => void;
}) {
  const [choice, setChoice] = useState<"property" | "op" | null>(null);
  const ops = rule.property === "status" ? STATUS_OPS : TEXT_OPS;
  return (
    <div>
      <div className="flex items-center gap-1">
        <ChoiceButton
          label="필터 속성"
          open={choice === "property"}
          text={PROPERTIES.find((item) => item.id === rule.property)?.label ?? "상태"}
          onClick={() => setChoice((current) => (current === "property" ? null : "property"))}
        />
        <ChoiceButton
          label="필터 조건"
          open={choice === "op"}
          text={ops.find((item) => item.id === rule.op)?.label ?? ops[0]?.label ?? ""}
          onClick={() => setChoice((current) => (current === "op" ? null : "op"))}
        />
        <button
          type="button"
          aria-label="필터 삭제"
          className="ml-auto shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
          onClick={onDelete}
        >
          <XIcon aria-hidden="true" size={iconSize} />
        </button>
      </div>
      {choice === "property" && (
        <div className="mt-1 flex flex-wrap gap-1">
          {PROPERTIES.map((item) => (
            <Pick
              key={item.id}
              pressed={rule.property === item.id}
              onClick={() => {
                if (rule.property !== item.id) {
                  onChange({
                    ...rule,
                    property: item.id,
                    op: item.id === "status" ? "is" : "contains",
                    values: [],
                  });
                }
                setChoice(null);
              }}
            >
              {item.label}
            </Pick>
          ))}
        </div>
      )}
      {choice === "op" && (
        <div className="mt-1 flex flex-wrap gap-1">
          {ops.map((item) => (
            <Pick
              key={item.id}
              pressed={rule.op === item.id}
              onClick={() => {
                onChange({ ...rule, op: item.id });
                setChoice(null);
              }}
            >
              {item.label}
            </Pick>
          ))}
        </div>
      )}
      <div className="mt-1">
        <RuleValue
          rule={rule}
          catalog={catalog}
          tags={tags}
          onChange={(values) => onChange({ ...rule, values })}
        />
      </div>
    </div>
  );
}

function BarsEditor({
  catalog,
  bars,
  onChange,
}: {
  catalog: TodoStatusDef[];
  bars: string[];
  onChange: (bars: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs text-fg-secondary">막대</p>
      <p className="mt-1 text-xs text-fg-muted">
        {bars.length > 0 ? "켜 둔 상태의 날만 막대에 나옵니다." : "모든 날을 그립니다."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {catalog.map((status) => (
          <StatusPick
            key={status.id}
            name={status.name}
            color={status.color}
            label={`${status.name} 막대`}
            pressed={bars.includes(status.id)}
            onClick={() =>
              onChange(
                bars.includes(status.id)
                  ? bars.filter((id) => id !== status.id)
                  : [...bars, status.id],
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function RuleValue({
  rule,
  catalog,
  tags,
  onChange,
}: {
  rule: FilterRule;
  catalog: TodoStatusDef[];
  tags: string[];
  onChange: (values: string[]) => void;
}) {
  if (rule.property === "status") {
    return (
      <div className="flex flex-wrap gap-1">
        {catalog.map((status) => (
          <StatusPick
            key={status.id}
            name={status.name}
            color={status.color}
            label={`${status.name} 조건`}
            pressed={rule.values.includes(status.id)}
            onClick={() =>
              onChange(
                rule.values.includes(status.id)
                  ? rule.values.filter((id) => id !== status.id)
                  : [...rule.values, status.id],
              )
            }
          />
        ))}
      </div>
    );
  }
  if (rule.property === "tag") {
    const known = [...new Set([...tags, ...rule.values])];
    return (
      <div className="flex flex-col gap-1">
        {known.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {known.map((tag) => (
              <Pick
                key={tag}
                pressed={rule.values.includes(tag)}
                onClick={() =>
                  onChange(
                    rule.values.includes(tag)
                      ? rule.values.filter((item) => item !== tag)
                      : [...rule.values, tag],
                  )
                }
              >
                {tag}
              </Pick>
            ))}
          </div>
        )}
        <TagDraft
          onAdd={(tag) => {
            if (rule.values.includes(tag)) return;
            onChange([...rule.values, tag]);
          }}
        />
      </div>
    );
  }
  return (
    <input
      aria-label="제목 값"
      value={rule.values[0] ?? ""}
      placeholder="제목에 포함된 글자"
      className="w-full rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
      onChange={(event) => onChange(event.target.value.trim() ? [event.target.value] : [])}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing && event.key === "Enter") event.preventDefault();
      }}
    />
  );
}

function TagDraft({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const next = value.trim();
    if (!next) return;
    onAdd(next);
    setValue("");
  };
  return (
    <input
      aria-label="태그 값"
      value={value}
      placeholder="태그"
      className="w-full rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
      onChange={(event) => setValue(event.target.value)}
      onBlur={add}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key !== "Enter") return;
        event.preventDefault();
        add();
      }}
    />
  );
}

function ChoiceButton({
  label,
  text,
  open,
  onClick,
}: {
  label: string;
  text: string;
  open: boolean;
  onClick: () => void;
}) {
  const icon = useIconScale();
  return (
    <button
      type="button"
      aria-label={`${label} ${text}`}
      aria-expanded={open}
      className="inline-flex items-center gap-1 rounded-md bg-fg/5 px-2 py-1 text-xs text-fg hover:bg-fg/10"
      onClick={onClick}
    >
      {text}
      <CaretDownIcon aria-hidden="true" size={icon(10)} />
    </button>
  );
}

function Pick({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-full pad-xs text-xs",
        pressed ? "bg-fg/10 text-fg" : "text-fg-secondary hover:bg-fg/10",
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
  label,
}: {
  name: string;
  color: string;
  pressed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
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
