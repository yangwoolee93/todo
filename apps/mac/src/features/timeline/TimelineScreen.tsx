import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckIcon,
  DotsThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { GlassButton } from "../../components/GlassButton";
import { useIconScale } from "../../hooks/useIconScale";
import { useDetailPanelStore } from "../../stores/useDetailPanelStore";
import { useSidebarStore } from "../../stores/useSidebarStore";
import {
  isBuiltinStatus,
  nextStatusColor,
  statusPalette,
  statusesFor,
  useTimelineStore,
  type SeriesDraft,
  type TimelineTodo,
  type TodoStatusDef,
} from "../../stores/useTimelineStore";
import { cn } from "../../utils/cn";
import { TrashHoldConfirm } from "../trash/TrashHoldConfirm";
import { ViewToolbar } from "./FilterMenu";
import { setSeriesOpen } from "./fold";
import { TimelineBars } from "./TimelineBars";
import {
  activeViewId,
  emptyTimelineView,
  presentBars,
  showsInView,
  tagsForDraft,
  viewNarrows,
  viewsForPage,
} from "./view";
import {
  datesFrom,
  daysInMonth,
  daysInMonths,
  daysOfMonth,
  monthsAround,
  orderedSpan,
  parseIso,
  shiftMonth,
  spanLabel,
  todayIso,
  WEEKDAYS,
  type DayColumn,
  type MonthMark,
} from "./days";
import { DetailPanelBody, DetailPanelMenuBody } from "../detail/DetailPanelSlot";

const EDGE_DAYS = 6;

type DateSpan = { start: string; end: string };
type DragSession = { pointerId: number; origin: string; moved: boolean };

export function TimelineScreen({ pageId }: { pageId: string }) {
  const todos = useTimelineStore((state) => state.todos);
  const savedStatuses = useTimelineStore((state) => state.statuses);
  const [months, setMonths] = useState<MonthMark[]>(() => monthsAround());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverRange, setHoverRange] = useState<DateSpan | null>(null);
  const [pendingRange, setPendingRange] = useState<DateSpan | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [childParentId, setChildParentId] = useState<string | null>(null);
  const savedViews = useTimelineStore((state) => state.views);
  const pageTitle = useSidebarStore(
    (state) => state.pages.find((page) => page.id === pageId)?.name ?? "",
  );
  const listedViews = useMemo(() => viewsForPage(savedViews, pageId), [savedViews, pageId]);
  const fallbackView = useMemo(() => emptyTimelineView(pageId), [pageId]);
  const selectedViewId = activeViewId(savedViews, pageId);
  const view =
    listedViews.find((item) => item.id === selectedViewId) ?? listedViews[0] ?? fallbackView;
  const setTimelineView = useTimelineStore((state) => state.setTimelineView);
  const selectTimelineView = useTimelineStore((state) => state.selectTimelineView);
  const addTimelineView = useTimelineStore((state) => state.addTimelineView);
  const renameTimelineView = useTimelineStore((state) => state.renameTimelineView);
  const removeTimelineView = useTimelineStore((state) => state.removeTimelineView);
  const detailPurpose = useDetailPanelStore((state) => state.purpose);
  const [todayInView, setTodayInView] = useState(true);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClick = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const monthsRef = useRef(months);
  const shiftRef = useRef(0);
  const lockRef = useRef(false);
  const bootRef = useRef(true);
  const jumpRef = useRef(false);
  monthsRef.current = months;
  const today = todayIso();
  const days = useMemo(() => daysInMonths(months), [months]);
  const pageTodos = useMemo(() => {
    const onPage = todos.filter((todo) => todo.pageId === pageId);
    const hidden = new Set(
      onPage.filter((todo) => todo.deletedAt != null).map((todo) => todo.seriesId),
    );
    return onPage.filter(
      (todo) =>
        todo.deletedAt == null && todo.omittedAt == null && !hidden.has(todo.parentSeriesId),
    );
  }, [todos, pageId]);
  const catalog = useMemo(
    () => statusesFor(savedStatuses, pageId),
    [savedStatuses, pageId],
  );
  const pageTags = useMemo(() => {
    const tags = new Set<string>();
    for (const todo of pageTodos) {
      for (const tag of todo.tags) tags.add(tag);
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "ko"));
  }, [pageTodos]);
  const bars = useMemo(
    () => presentBars(pageTodos, days, view, new Set(catalog.map((status) => status.id))),
    [pageTodos, days, view, catalog],
  );
  const freshHidden =
    freshId != null && freshId === selectedId && !bars.some((bar) => bar.seriesId === freshId);
  const seriesTodos = pageTodos
    .filter((todo) => todo.seriesId === selectedId)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const selectedSpan = useMemo(() => {
    if (seriesTodos.length === 0) return null;
    return {
      start: seriesTodos[0]?.date ?? "",
      end: seriesTodos[seriesTodos.length - 1]?.date ?? "",
    };
  }, [seriesTodos]);

  useEffect(() => {
    if (!freshId) return;
    if (selectedId !== freshId || bars.some((bar) => bar.seriesId === freshId)) {
      setFreshId(null);
    }
  }, [freshId, selectedId, bars]);

  useEffect(() => {
    return () => {
      useDetailPanelStore.getState().closePanel();
    };
  }, []);

  useEffect(() => {
    const panel = useDetailPanelStore.getState();
    if (selectedId || pendingRange) panel.openPanel();
    else if (panel.purpose !== "statuses") panel.closePanel();
  }, [selectedId, pendingRange]);

  useEffect(() => {
    if (!selectedId) return;
    if (pageTodos.some((todo) => todo.seriesId === selectedId)) return;
    setSelectedId(null);
  }, [pageTodos, selectedId]);

  useEffect(() => {
    return useDetailPanelStore.subscribe((state, previous) => {
      if (state.purpose === "statuses" && previous.purpose !== "statuses") {
        setSelectedId(null);
        setPendingRange(null);
        setChildParentId(null);
      }
      if (previous.open && !state.open) {
        setSelectedId(null);
        setPendingRange(null);
        setChildParentId(null);
      }
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    lockRef.current = true;
    let moved = false;
    if (shiftRef.current) {
      el.scrollLeft += shiftRef.current;
      shiftRef.current = 0;
      moved = true;
    }
    if (bootRef.current || jumpRef.current) {
      scrollTodayToCenter(el);
      bootRef.current = false;
      jumpRef.current = false;
      moved = true;
    }
    if (moved) el.dispatchEvent(new Event("scroll"));
    lockRef.current = false;
    publishToday(el, setTodayInView);
  }, [months]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      publishToday(el, setTodayInView);
      if (lockRef.current) return;
      const width = columnWidth(el);
      if (width <= 0) return;
      const edge = width * EDGE_DAYS;
      if (el.scrollLeft < edge) {
        const first = monthsRef.current[0];
        if (!first) return;
        const prev = shiftMonth(first.year, first.month, -1);
        lockRef.current = true;
        shiftRef.current = daysInMonth(prev.year, prev.month) * width;
        const next = [prev, ...monthsRef.current];
        monthsRef.current = next;
        setMonths(next);
        return;
      }
      if (el.scrollWidth - el.scrollLeft - el.clientWidth < edge) {
        const last = monthsRef.current[monthsRef.current.length - 1];
        if (!last) return;
        lockRef.current = true;
        const next = [
          ...monthsRef.current,
          shiftMonth(last.year, last.month, 1),
        ];
        monthsRef.current = next;
        setMonths(next);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pageId]);

  const openItem = (seriesId: string) => {
    setPendingRange(null);
    setChildParentId(null);
    setSelectedId(seriesId);
  };

  const openDraft = (span: DateSpan) => {
    setSelectedId(null);
    setChildParentId(null);
    setPendingRange(span);
    setDraftKey((key) => key + 1);
  };

  const preview = hoverRange ?? pendingRange;
  const previewBox = preview ? spanBox(days, preview) : null;

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const date = dateAt(event.clientX);
    if (!date) return;
    dragRef.current = {
      pointerId: event.pointerId,
      origin: date,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 포인터가 이미 끝난 경우에는 캡처 없이 같은 칸의 이동만 따라간다.
    }
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    nudgeTimeline(scrollRef.current, event.clientX);
    const date = dateAt(event.clientX);
    if (!date || date === drag.origin) {
      setHoverRange((current) => (current ? null : current));
      return;
    }
    drag.moved = true;
    const next = orderedSpan(drag.origin, date);
    setHoverRange((current) =>
      current && current.start === next.start && current.end === next.end
        ? current
        : next,
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const date = dateAt(event.clientX);
    setHoverRange(null);
    if (!drag.moved || !date || date === drag.origin) {
      openDraft({ start: date ?? drag.origin, end: date ?? drag.origin });
      return;
    }
    suppressClick.current = true;
    requestAnimationFrame(() => {
      suppressClick.current = false;
    });
    openDraft(orderedSpan(drag.origin, date));
  };

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setHoverRange(null);
  };

  const saveRange = (draft: SeriesDraft) => {
    if (!pendingRange) return;
    const dates = datesFrom(pendingRange.start, pendingRange.end);
    const store = useTimelineStore.getState();
    const seriesId = childParentId
      ? store.addChildSeries(pageId, childParentId, dates, draft)
      : store.addSeries(pageId, dates, draft);
    if (childParentId) setSeriesOpen(childParentId, true);
    setPendingRange(null);
    setChildParentId(null);
    if (!seriesId) return;
    setSelectedId(seriesId);
    const visible = showsInView(
      view,
      { title: draft.title, tags: draft.tags },
      new Set(catalog.map((status) => status.id)),
    );
    setFreshId(visible ? null : seriesId);
  };

  const childLimit = (() => {
    if (!childParentId) return null;
    const parentDays = pageTodos
      .filter((todo) => todo.seriesId === childParentId)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const start = parentDays[0]?.date;
    const end = parentDays[parentDays.length - 1]?.date;
    if (!start || !end) return null;
    return { start, end };
  })();

  const showToday = () => {
    lockRef.current = true;
    shiftRef.current = 0;
    jumpRef.current = true;
    const next = monthsAround();
    monthsRef.current = next;
    setMonths(next);
  };

  const dateAt = (clientX: number) => {
    const track = trackRef.current;
    const column = track?.querySelector<HTMLElement>("[data-day]");
    if (!track || !column) return null;
    const width = column.getBoundingClientRect().width;
    if (width <= 0) return null;
    const index = Math.floor(
      (clientX - track.getBoundingClientRect().left) / width,
    );
    return days[index]?.date ?? null;
  };

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <ViewToolbar
        catalog={catalog}
        tags={pageTags}
        views={listedViews}
        pageTitle={pageTitle}
        view={view}
        onChange={(next) => setTimelineView(pageId, next)}
        onSelect={(id) => selectTimelineView(pageId, id)}
        onCreate={(name) => addTimelineView(pageId, name)}
        onRename={(id, name) => renameTimelineView(pageId, id, name)}
        onRemove={(id) => removeTimelineView(pageId, id)}
      >
        {!todayInView && (
          <GlassButton className="pad-sm text-sm" onClick={showToday}>
            오늘
          </GlassButton>
        )}
        {freshHidden ? (
          <p className="min-w-0 truncate text-sm text-fg-secondary" role="status">
            이 보기에서는 방금 만든 할일이 보이지 않습니다.
          </p>
        ) : (
          bars.length === 0 && (
            <p className="min-w-0 truncate text-sm text-fg-secondary">
              {pageTodos.length > 0 && viewNarrows(view)
                ? "필터에 맞는 할일이 없습니다."
                : "막대를 누르면 그 할일이 열립니다. 빈 칸을 누르거나 끌면 새 할일을 만듭니다."}
            </p>
          )
        )}
      </ViewToolbar>
      <div
        ref={scrollRef}
        role="region"
        aria-label="케이던스"
        data-timeline-scroll
        className="scrollbar mt-2 min-h-0 flex-1 overflow-auto overscroll-x-contain"
      >
        <div
          ref={trackRef}
          className="flex min-h-full flex-col"
          style={{ width: `${days.length * 4}rem` }}
        >
          <div className="sticky top-0 z-20 bg-base">
            <div className="flex">
              {monthBlocks(days).map((block) => (
                <div
                  key={block.key}
                  className="shrink-0"
                  style={{ width: `${block.count * 4}rem` }}
                >
                  <div className="sticky left-0 w-fit max-w-full truncate px-2 py-1 text-xs text-fg-secondary">
                    {block.label}
                  </div>
                </div>
              ))}
            </div>
            <div
              data-opens-detail
              className="flex border-b border-border"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={cancelDrag}
            >
              {days.map((day, index) => (
                <DayHead
                  key={day.date}
                  day={day}
                  today={day.date === today}
                  selected={inSpan(day.date, preview ?? selectedSpan)}
                  monthStart={index > 0 && monthStarts(days, index)}
                  onOpen={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    openDraft({ start: day.date, end: day.date });
                  }}
                />
              ))}
            </div>
          </div>
          <div className="relative min-h-48 flex-1">
            <div
              data-opens-detail
              className={cn(
                "absolute inset-0 flex cursor-pointer",
                hoverRange && "cursor-ew-resize",
              )}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={cancelDrag}
            >
              {days.map((day, index) => (
                <div
                  key={day.date}
                  className={cn(
                    "h-full w-16 shrink-0 border-r border-border/40",
                    monthStarts(days, index) &&
                      index > 0 &&
                      "border-l border-l-border-strong",
                    inSpan(day.date, preview ?? selectedSpan) && "bg-accent/10",
                  )}
                />
              ))}
            </div>
            <TimelineBars
              bars={bars}
              catalog={catalog}
              selectedId={selectedId}
              scrollRef={scrollRef}
              dayCount={days.length}
              sorts={view.sorts}
              preview={
                preview && previewBox
                  ? {
                      start: preview.start,
                      end: preview.end,
                      parentSeriesId: childParentId,
                      box: previewBox,
                    }
                  : null
              }
              onOpen={openItem}
            />
          </div>
        </div>
      </div>
      {pendingRange && (
        <DetailPanelBody>
          <ItemDraft
            key={draftKey}
            range={pendingRange}
            limit={childLimit}
            initialTags={tagsForDraft(view)}
            onRange={(span) => setPendingRange(clampSpan(span, childLimit))}
            onSave={saveRange}
            onCancel={() => {
              setPendingRange(null);
              setChildParentId(null);
            }}
          />
        </DetailPanelBody>
      )}
      {detailPurpose === "statuses" && !pendingRange && !selectedId && (
        <DetailPanelBody>
          <StatusBoard pageId={pageId} catalog={catalog} />
        </DetailPanelBody>
      )}
      {selectedId && seriesTodos.length > 0 && !pendingRange && (
        <DetailPanelBody>
          <ItemDetail
            key={selectedId}
            pageId={pageId}
            seriesId={selectedId}
            todos={seriesTodos}
            onAddChild={
              seriesTodos[0]?.parentSeriesId
                ? undefined
                : () => {
                    const start = seriesTodos[0]?.date ?? "";
                    const end = seriesTodos[seriesTodos.length - 1]?.date ?? "";
                    if (!start || !end) return;
                    setChildParentId(selectedId);
                    setPendingRange({ start, end });
                    setDraftKey((key) => key + 1);
                  }
            }
          />
        </DetailPanelBody>
      )}
    </div>
  );
}

function DayHead({
  day,
  today,
  selected,
  monthStart,
  onOpen,
}: {
  day: DayColumn;
  today: boolean;
  selected: boolean;
  monthStart: boolean;
  onOpen: () => void;
}) {
  const tone =
    day.weekday === 0
      ? "text-danger"
      : day.weekday === 6
        ? "text-saturday"
        : undefined;
  return (
    <button
      type="button"
      data-day
      data-today={today ? "" : undefined}
      data-opens-detail
      aria-pressed={selected}
      className={cn(
        "flex w-16 shrink-0 flex-col items-center gap-0.5 border-r border-border/50 py-1.5",
        monthStart && "border-l border-l-border-strong",
      )}
      onClick={onOpen}
    >
      <span className={cn("text-xs", tone ?? "text-fg-secondary")}>
        {WEEKDAYS[day.weekday]}
      </span>
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
          tone ?? "text-fg",
          today && "ring-2 ring-today-ring",
          selected && "bg-fg/10",
        )}
      >
        {day.day}
      </span>
    </button>
  );
}

function ItemDetail({
  pageId,
  seriesId,
  todos,
  onAddChild,
}: {
  pageId: string;
  seriesId: string;
  todos: TimelineTodo[];
  onAddChild?: () => void;
}) {
  const savedStatuses = useTimelineStore((state) => state.statuses);
  const renameSeries = useTimelineStore((state) => state.renameSeries);
  const setSeriesBody = useTimelineStore((state) => state.setSeriesBody);
  const setSeriesTags = useTimelineStore((state) => state.setSeriesTags);
  const setSeriesSpan = useTimelineStore((state) => state.setSeriesSpan);
  const setStatus = useTimelineStore((state) => state.setStatus);
  const addDayCheck = useTimelineStore((state) => state.addDayCheck);
  const toggleDayCheck = useTimelineStore((state) => state.toggleDayCheck);
  const renameDayCheck = useTimelineStore((state) => state.renameDayCheck);
  const removeDayCheck = useTimelineStore((state) => state.removeDayCheck);
  const removeSeries = useTimelineStore((state) => state.removeSeries);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [picked, setPicked] = useState(() => dayInSpan(todos, todayIso()));
  const catalog = statusesFor(savedStatuses, pageId);
  const start = todos[0]?.date ?? "";
  const end = todos[todos.length - 1]?.date ?? "";
  const title = todos[0]?.title ?? "";
  const body = todos[0]?.body ?? "";
  const tags = todos[0]?.tags ?? [];
  const selectedDate = todos.some((todo) => todo.date === picked)
    ? picked
    : dayInSpan(todos, todayIso());
  const current = todos.find((todo) => todo.date === selectedDate) ?? todos[0];

  const changeDate = (edge: "start" | "end", value: string) => {
    if (!parseIso(value)) return;
    const next =
      edge === "start" ? orderedSpan(value, end) : orderedSpan(start, value);
    setSeriesSpan(seriesId, next.start, next.end);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailPanelMenuBody>
        <ItemMenu onDelete={() => setConfirmingDelete(true)} />
      </DetailPanelMenuBody>
      <div className="flex items-center px-4 pt-3">
        <TitleField
          title={title}
          onCommit={(next) => renameSeries(seriesId, next)}
        />
      </div>
      {confirmingDelete && (
        <TrashHoldConfirm
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => removeSeries(seriesId)}
        />
      )}
      <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <BodyField
          body={body}
          onCommit={(next) => setSeriesBody(seriesId, next)}
        />
        <div className="mt-2">
          <TagEditor
            tags={tags}
            onChange={(next) => setSeriesTags(seriesId, next)}
          />
        </div>
        <div className="mt-4">
          <DateRange start={start} end={end} onChange={changeDate} />
          <p className="mt-2 text-sm text-fg-secondary">
            {spanLabel(start, end)}
          </p>
          {onAddChild && (
            <button
              type="button"
              className="mt-3 rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
              onClick={onAddChild}
            >
              하위 추가
            </button>
          )}
          <DayStrip
            todos={todos}
            catalog={catalog}
            selected={selectedDate}
            onSelect={setPicked}
          />
        </div>
        {current && (
          <div className="mt-3">
            <p className="text-sm text-fg">{shortDay(current.date)}</p>
            <div className="mt-2">
              <StatusButtons
                catalog={catalog}
                status={current.status}
                onChange={(next) => setStatus(current.id, next)}
              />
            </div>
            <DayChecks
              key={current.id}
              checks={current.checks ?? []}
              onAdd={(text) => addDayCheck(current.id, text)}
              onToggle={(checkId) => toggleDayCheck(current.id, checkId)}
              onRename={(checkId, text) => renameDayCheck(current.id, checkId, text)}
              onRemove={(checkId) => removeDayCheck(current.id, checkId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ItemMenu({ onDelete }: { onDelete: () => void }) {
  const icon = useIconScale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div ref={rootRef} className="relative">
      <GlassButton
        aria-label="더보기"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex p-2 hover:bg-fg/10"
        onClick={() => setOpen((value) => !value)}
      >
        <DotsThreeIcon aria-hidden="true" size={icon(20)} weight="bold" />
      </GlassButton>
      {open && (
        <div
          role="menu"
          className="menu-xs absolute top-full right-0 z-30 mt-2 flex flex-col rounded-xl border border-border bg-surface"
        >
          <button
            type="button"
            role="menuitem"
            className="rounded-md pad-xs text-left text-xs text-fg hover:bg-fg/10"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBoard({
  pageId,
  catalog,
}: {
  pageId: string;
  catalog: TodoStatusDef[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-4 pt-3 text-lg font-medium text-fg">상태</h2>
      <p className="px-4 pt-1 text-sm text-fg-secondary">
        이 화면의 할일이 함께 쓰는 상태입니다.
      </p>
      <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <StatusManager pageId={pageId} catalog={catalog} />
      </div>
    </div>
  );
}

function ItemDraft({
  range,
  limit,
  initialTags,
  onRange,
  onSave,
  onCancel,
}: {
  range: DateSpan;
  limit: DateSpan | null;
  initialTags: string[];
  onRange: (span: DateSpan) => void;
  onSave: (draft: SeriesDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState(initialTags);
  const tagsRef = useRef(initialTags);

  const setTagList = (next: string[]) => {
    tagsRef.current = next;
    setTags(next);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ title, body, tags: tagsRef.current });
  };

  const changeDate = (edge: "start" | "end", value: string) => {
    if (!parseIso(value)) return;
    const next =
      edge === "start"
        ? orderedSpan(value, range.end)
        : orderedSpan(range.start, value);
    onRange(next);
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
      <div className="px-4 pt-3">
        <input
          autoFocus
          aria-label="제목"
          value={title}
          placeholder="제목"
          className="w-full bg-transparent text-lg font-medium text-fg outline-none placeholder:text-fg-muted"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing && event.key === "Enter")
              event.preventDefault();
          }}
        />
      </div>
      <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <textarea
          aria-label="내용"
          value={body}
          placeholder="내용"
          rows={8}
          className="w-full resize-none rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="mt-2">
          <TagEditor tags={tags} onChange={setTagList} />
        </div>
        <div className="mt-4">
          <DateRange
            start={range.start}
            end={range.end}
            min={limit?.start}
            max={limit?.end}
            onChange={changeDate}
          />
          <p className="mt-2 text-sm text-fg-secondary">
            {spanLabel(range.start, range.end)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-border p-3">
        <button
          type="button"
          className="rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-full pad-xs text-xs text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
        >
          추가
        </button>
      </div>
    </form>
  );
}

function DateRange({
  start,
  end,
  min,
  max,
  onChange,
}: {
  start: string;
  end: string;
  min?: string;
  max?: string;
  onChange: (edge: "start" | "end", value: string) => void;
}) {
  const [open, setOpen] = useState<"start" | "end" | null>(null);
  const [shown, setShown] = useState<"start" | "end" | null>(null);
  const [present, setPresent] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPresent(false);
      return;
    }
    setShown(open);
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPresent(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);

  useEffect(() => {
    if (open || present || !shown) return;
    const timer = window.setTimeout(() => setShown(null), 200);
    return () => window.clearTimeout(timer);
  }, [open, present, shown]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (edge: "start" | "end") => {
    setOpen((current) => (current === edge ? null : edge));
  };

  return (
    <div ref={rootRef}>
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="시작"
          name="시작일"
          value={start}
          open={open === "start"}
          onToggle={() => toggle("start")}
        />
        <DateField
          label="종료"
          name="종료일"
          value={end}
          open={open === "end"}
          onToggle={() => toggle("end")}
        />
      </div>
      {shown && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            present ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <DateCalendar
              value={shown === "start" ? start : end}
              start={start}
              end={end}
              min={min}
              max={max}
              onPick={(value) => {
                onChange(shown, value);
                setOpen(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  name,
  value,
  open,
  onToggle,
}: {
  label: string;
  name: string;
  value: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-secondary">
      {label}
      <button
        type="button"
        aria-label={name}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "rounded-lg bg-fg/5 pad-field text-left text-sm text-fg",
          open && "ring-1 ring-accent",
        )}
        onClick={onToggle}
      >
        {fieldDate(value)}
      </button>
    </label>
  );
}

function DateCalendar({
  value,
  start,
  end,
  min,
  max,
  onPick,
}: {
  value: string;
  start: string;
  end: string;
  min?: string;
  max?: string;
  onPick: (value: string) => void;
}) {
  const icon = useIconScale();
  const parsed = parseIso(value);
  const [cursor, setCursor] = useState(() =>
    parsed
      ? { year: parsed.year, month: parsed.month }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useEffect(() => {
    const next = parseIso(value);
    if (!next) return;
    setCursor({ year: next.year, month: next.month });
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: "nearest" });
    }, 200);
    return () => window.clearTimeout(timer);
  }, []);

  const days = daysOfMonth(cursor.year, cursor.month);
  const lead = days[0]?.weekday ?? 0;
  const move = (delta: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="날짜"
      className="mt-2 rounded-xl bg-surface p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          className="rounded-full p-1 text-fg-secondary hover:bg-fg/10 hover:text-fg"
          onClick={() => move(-1)}
        >
          <CaretLeftIcon aria-hidden="true" size={icon(16)} />
        </button>
        <span className="text-sm font-medium text-fg">
          {cursor.year}년 {cursor.month}월
        </span>
        <button
          type="button"
          aria-label="다음 달"
          className="rounded-full p-1 text-fg-secondary hover:bg-fg/10 hover:text-fg"
          onClick={() => move(1)}
        >
          <CaretRightIcon aria-hidden="true" size={icon(16)} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-sm">
        {WEEKDAYS.map((weekday, index) => (
          <span
            key={weekday}
            className={cn(
              "flex h-8 items-center justify-center text-fg-secondary",
              index === 0 && "text-danger",
              index === 6 && "text-saturday",
            )}
          >
            {weekday}
          </span>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <span key={`lead-${index}`} />
        ))}
        {days.map((day) => {
          const blocked = (min != null && day.date < min) || (max != null && day.date > max);
          const chosen = day.date === value;
          const inside = day.date >= start && day.date <= end && !chosen;
          return (
            <button
              key={day.date}
              type="button"
              aria-label={shortDay(day.date)}
              aria-pressed={chosen}
              disabled={blocked}
              className={cn(
                "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-base font-medium",
                day.weekday === 0 && "text-danger",
                day.weekday === 6 && "text-saturday",
                day.weekday !== 0 && day.weekday !== 6 && "text-fg",
                inside && "bg-accent/15",
                day.date === today && !chosen && "ring-2 ring-today-ring",
                chosen && "bg-fg",
                blocked && "pointer-events-none opacity-30",
                !chosen && !blocked && "hover:bg-fg/10",
              )}
              style={chosen ? { color: "var(--color-base)" } : undefined}
              onClick={() => onPick(day.date)}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fieldDate(value: string) {
  const parsed = parseIso(value);
  if (!parsed) return value;
  return `${parsed.year}. ${parsed.month}. ${parsed.day}.`;
}

function DayStrip({
  todos,
  catalog,
  selected,
  onSelect,
}: {
  todos: TimelineTodo[];
  catalog: TodoStatusDef[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [selected]);

  return (
    <div className="scrollbar mt-3 flex gap-1 overflow-x-auto">
      {todos.map((todo) => {
        const parsed = parseIso(todo.date);
        const weekday = parsed
          ? WEEKDAYS[new Date(parsed.year, parsed.month - 1, parsed.day).getDay()]
          : "";
        const count = todo.checks?.length ?? 0;
        const pressed = todo.date === selected;
        return (
          <button
            key={todo.id}
            ref={pressed ? selectedRef : undefined}
            type="button"
            aria-pressed={pressed}
            aria-label={shortDay(todo.date)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs",
              pressed ? "bg-fg/10 text-fg" : "text-fg-secondary hover:bg-fg/5",
            )}
            onClick={() => onSelect(todo.date)}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusColor(catalog, todo.status) }}
            />
            <span>{parsed ? `${parsed.day} ${weekday}` : todo.date}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DayChecks({
  checks,
  onAdd,
  onToggle,
  onRename,
  onRemove,
}: {
  checks: TimelineTodo["checks"];
  onAdd: (text: string) => void;
  onToggle: (checkId: string) => void;
  onRename: (checkId: string, text: string) => void;
  onRemove: (checkId: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const addDraft = (raw: string) => {
    const next = raw.trim();
    setDraft("");
    if (!next) return;
    onAdd(next);
  };

  return (
    <div className="mt-3 flex flex-col gap-1 rounded-lg bg-fg/5 pad-field">
      {checks.map((check) => (
        <div key={check.id} className="flex items-center gap-1">
          <button
            type="button"
            aria-checked={check.done}
            aria-label={check.done ? `${check.text} 완료 해제` : `${check.text} 완료`}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
              check.done ? "border-fg bg-fg text-base" : "border-fg/30",
            )}
            onClick={() => onToggle(check.id)}
          >
            {check.done && <CheckIcon aria-hidden="true" size={12} weight="bold" />}
          </button>
          <CheckText
            text={check.text}
            done={check.done}
            onCommit={(next) => {
              if (!next.trim()) onRemove(check.id);
              else onRename(check.id, next);
            }}
          />
        </div>
      ))}
      <div className="flex items-center gap-1">
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded border border-fg/30"
        />
        <input
          aria-label="할일 추가"
          value={draft}
          placeholder="할일 추가"
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => addDraft(draft)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key !== "Enter") return;
            event.preventDefault();
            addDraft(draft);
          }}
        />
      </div>
    </div>
  );
}

function CheckText({
  text,
  done,
  onCommit,
}: {
  text: string;
  done: boolean;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(text);
  const cancelRef = useRef(false);

  useEffect(() => {
    setValue(text);
  }, [text]);

  const commit = (raw: string) => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setValue(text);
      return;
    }
    const next = raw.trim();
    if (next === text) {
      setValue(text);
      return;
    }
    onCommit(next);
  };

  return (
    <input
      aria-label="할일"
      value={value}
      className={cn(
        "min-w-0 flex-1 bg-transparent text-sm outline-none",
        done ? "text-fg-muted line-through" : "text-fg",
      )}
      onChange={(event) => setValue(event.target.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
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

function StatusButtons({
  catalog,
  status,
  onChange,
}: {
  catalog: TodoStatusDef[];
  status: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {catalog.map((item) => {
        const selected = status === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full pad-xs text-xs",
              !selected && "text-fg-secondary hover:bg-fg/10",
            )}
            style={
              selected
                ? { backgroundColor: item.color, color: ink(item.color) }
                : undefined
            }
            onClick={() => onChange(item.id)}
          >
            {!selected && (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

function StatusManager({
  pageId,
  catalog,
}: {
  pageId: string;
  catalog: TodoStatusDef[];
}) {
  const icon = useIconScale();
  const renameStatus = useTimelineStore((state) => state.renameStatus);
  const recolorStatus = useTimelineStore((state) => state.recolorStatus);
  const moveStatus = useTimelineStore((state) => state.moveStatus);
  const addStatus = useTimelineStore((state) => state.addStatus);
  const removeStatus = useTimelineStore((state) => state.removeStatus);
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => nextStatusColor(catalog.length));
  const [editing, setEditing] = useState<string | null>(null);
  const newColorRef = useRef<HTMLButtonElement>(null);
  const choices = colorChoices(catalog);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addStatus(pageId, name, color);
    setName("");
    setColor(nextStatusColor(catalog.length + 1));
    setEditing(null);
  };

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {catalog.map((status, index) => (
          <StatusRow
            key={status.id}
            status={status}
            iconSize={icon(12)}
            open={editing === status.id}
            choices={choices}
            onToggle={() =>
              setEditing((current) => (current === status.id ? null : status.id))
            }
            onRename={(next) => renameStatus(pageId, status.id, next)}
            onColor={(next) => recolorStatus(pageId, status.id, next)}
            onMoveUp={() => moveStatus(pageId, status.id, -1)}
            onMoveDown={() => moveStatus(pageId, status.id, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < catalog.length - 1}
            onClose={() =>
              setEditing((current) => (current === status.id ? null : current))
            }
            onRemove={
              isBuiltinStatus(status.id)
                ? undefined
                : () => removeStatus(pageId, status.id)
            }
          />
        ))}
      </ul>
      <form className="mt-2 flex flex-col gap-1" onSubmit={add}>
        <div className="flex items-center gap-1">
          <ColorSwatch
            anchorRef={newColorRef}
            label="새 상태 색"
            value={color}
            open={editing === "new"}
            onToggle={() => setEditing((current) => (current === "new" ? null : "new"))}
          />
          <input
            aria-label="새 상태 이름"
            value={name}
            placeholder="상태 이름"
            className="min-w-0 flex-1 rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing && event.key === "Enter")
                event.preventDefault();
            }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-full pad-xs text-xs text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
          >
            추가
          </button>
        </div>
        {editing === "new" && (
          <ColorCodeEditor
            anchorRef={newColorRef}
            value={color}
            choices={choices}
            onChange={setColor}
            onClose={() => setEditing(null)}
          />
        )}
      </form>
    </div>
  );
}

function StatusRow({
  status,
  iconSize,
  open,
  choices,
  onToggle,
  onRename,
  onColor,
  onClose,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onRemove,
}: {
  status: TodoStatusDef;
  iconSize: number;
  open: boolean;
  choices: ColorChoices;
  onToggle: () => void;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onClose: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(status.name);
  const swatchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setName(status.name);
  }, [status.name]);

  const commit = () => {
    const next = name.trim();
    if (!next || next === status.name) {
      setName(status.name);
      return;
    }
    onRename(next);
  };

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <ColorSwatch
          anchorRef={swatchRef}
          label={`${status.name} 색`}
          value={status.color}
          open={open}
          onToggle={onToggle}
        />
        <input
          aria-label={`${status.name} 이름`}
          value={name}
          className="min-w-0 flex-1 rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none"
          onChange={(event) => setName(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.currentTarget.blur();
          }}
        />
        <button
          type="button"
          aria-label={`${status.name} 위로`}
          disabled={!canMoveUp}
          className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
          onClick={onMoveUp}
        >
          <CaretUpIcon aria-hidden="true" size={iconSize} />
        </button>
        <button
          type="button"
          aria-label={`${status.name} 아래로`}
          disabled={!canMoveDown}
          className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
          onClick={onMoveDown}
        >
          <CaretDownIcon aria-hidden="true" size={iconSize} />
        </button>
        {onRemove && (
          <button
            type="button"
            aria-label={`${status.name} 상태 삭제`}
            className="shrink-0 rounded-full p-1 text-fg-secondary hover:bg-fg/10"
            onClick={onRemove}
          >
            <XIcon aria-hidden="true" size={iconSize} />
          </button>
        )}
      </div>
      {open && (
        <ColorCodeEditor
          anchorRef={swatchRef}
          value={status.color}
          choices={choices}
          onChange={onColor}
          onClose={onClose}
        />
      )}
    </li>
  );
}

function ColorSwatch({
  anchorRef,
  label,
  value,
  open,
  onToggle,
}: {
  anchorRef?: RefObject<HTMLButtonElement | null>;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      ref={anchorRef}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        "h-7 w-7 shrink-0 rounded-full border border-border",
        open && "ring-2 ring-fg",
      )}
      style={{ backgroundColor: value }}
      onClick={onToggle}
    />
  );
}

function ColorCodeEditor({
  anchorRef,
  value,
  choices,
  onChange,
  onClose,
}: {
  anchorRef?: RefObject<HTMLButtonElement | null>;
  value: string;
  choices: ColorChoices;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const commitRef = useRef<() => void>(() => {});
  const cancelRef = useRef(false);
  const normalized = value.toLowerCase();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setDraft(normalized);
  }, [normalized]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      commitRef.current();
      onCloseRef.current();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [anchorRef]);

  const apply = (next: string) => {
    const color = next.toLowerCase();
    if (color === normalized) {
      setDraft(normalized);
      return;
    }
    onChange(color);
    setDraft(color);
  };

  const commit = () => {
    const next = parseColor(draft);
    if (!next) {
      setDraft(normalized);
      return;
    }
    apply(next);
  };
  commitRef.current = commit;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="색"
      className="flex flex-col gap-2 rounded-lg bg-fg/5 p-2"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current = true;
        onClose();
      }}
    >
      <input
        autoFocus
        aria-label="색 코드"
        value={draft}
        placeholder="#RRGGBB 또는 rgb()"
        spellCheck={false}
        className="w-full rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (cancelRef.current) return;
          commit();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.key !== "Enter") return;
          event.preventDefault();
          commit();
        }}
      />
      {choices.used.length > 0 && (
        <ColorSwatches label="쓰는 색" colors={choices.used} value={normalized} onPick={apply} />
      )}
      {choices.palette.length > 0 && (
        <ColorSwatches label="팔레트" colors={choices.palette} value={normalized} onPick={apply} />
      )}
      <button
        type="button"
        className="self-start rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10 hover:text-fg"
        onClick={() => pickerRef.current?.click()}
      >
        더 고르기
      </button>
      <input
        ref={pickerRef}
        tabIndex={-1}
        type="color"
        aria-label="시스템 색"
        value={normalized}
        className="sr-only"
        onChange={(event) => apply(event.target.value)}
      />
    </div>
  );
}

function ColorSwatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: string[];
  value: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={color === value}
            className={cn(
              "h-5 w-5 rounded-full border border-border",
              color === value && "ring-2 ring-fg",
            )}
            style={{ backgroundColor: color }}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPick(color)}
          />
        ))}
      </div>
    </div>
  );
}

type ColorChoices = { used: string[]; palette: string[] };

function colorChoices(catalog: TodoStatusDef[]): ColorChoices {
  const used: string[] = [];
  for (const status of catalog) {
    const color = status.color.toLowerCase();
    if (!used.includes(color)) used.push(color);
  }
  return {
    used,
    palette: statusPalette.filter((color) => !used.includes(color)),
  };
}

function parseColor(raw: string) {
  const text = raw.trim();
  const hex = text.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const body = hex[1] ?? "";
    const full = body.length === 3 ? [...body].map((part) => part + part).join("") : body;
    return `#${full.toLowerCase()}`;
  }
  const wrapped = text.match(
    /^rgba?\(\s*([0-9]{1,3}%?)\s*(?:,\s*|\s+)([0-9]{1,3}%?)\s*(?:,\s*|\s+)([0-9]{1,3}%?)(?:\s*(?:,|\/)\s*[0-9.]+%?)?\s*\)$/i,
  );
  const plain = text.match(/^([0-9]{1,3}%?)\s*,\s*([0-9]{1,3}%?)\s*,\s*([0-9]{1,3}%?)$/);
  const parts = wrapped ?? plain;
  if (!parts) return null;
  const channels = [parts[1], parts[2], parts[3]].map((part) => colorChannel(part ?? ""));
  if (channels.some((channel) => channel === null)) return null;
  return `#${channels.map((channel) => (channel ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

function colorChannel(raw: string) {
  const percent = raw.endsWith("%");
  const number = Number(percent ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(number)) return null;
  if (percent) {
    if (number < 0 || number > 100) return null;
    return Math.round((number / 100) * 255);
  }
  if (!Number.isInteger(number) || number < 0 || number > 255) return null;
  return number;
}

function BodyField({
  body,
  onCommit,
}: {
  body: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(body);

  useEffect(() => {
    setValue(body);
  }, [body]);

  const commit = () => {
    if (value.trim() === body) {
      setValue(body);
      return;
    }
    onCommit(value);
  };

  return (
    <textarea
      aria-label="내용"
      value={value}
      placeholder="내용"
      rows={8}
      className="w-full resize-none rounded-lg bg-fg/5 pad-field text-sm text-fg outline-none placeholder:text-fg-muted"
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
    />
  );
}

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const icon = useIconScale();
  const [draft, setDraft] = useState("");

  const commit = () => {
    const next = withTag(tags, draft);
    if (next !== tags) onChange(next);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-fg/5 pad-chip text-sm text-fg-secondary"
        >
          #{tag}
          <button
            type="button"
            aria-label={`${tag} 삭제`}
            className="flex rounded-full p-0.5 hover:bg-fg/10"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <XIcon aria-hidden="true" size={icon(12)} weight="bold" />
          </button>
        </span>
      ))}
      <input
        aria-label="해시태그"
        value={draft}
        placeholder="태그"
        className="min-w-[5.333em] flex-1 bg-transparent px-[0.333em] py-[0.167em] text-sm text-fg outline-none placeholder:text-fg-muted"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" || event.key === "," || event.key === " ") {
            event.preventDefault();
            commit();
            return;
          }
          if (event.key === "Backspace" && draft === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

function dayInSpan(todos: TimelineTodo[], today: string) {
  if (todos.some((todo) => todo.date === today)) return today;
  return todos[0]?.date ?? "";
}

function statusColor(catalog: TodoStatusDef[], status: string) {
  return catalog.find((item) => item.id === status)?.color ?? catalog[0]?.color ?? "#a8a29e";
}

function shortDay(value: string) {
  const parsed = parseIso(value);
  if (!parsed) return value;
  const weekday = new Date(parsed.year, parsed.month - 1, parsed.day).getDay();
  return `${parsed.month}월 ${parsed.day}일 ${WEEKDAYS[weekday]}`;
}

function TitleField({
  title,
  onCommit,
}: {
  title: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(title);

  useEffect(() => {
    setValue(title);
  }, [title]);

  const commit = () => {
    const next = value.trim();
    if (!next || next === title) {
      setValue(title);
      return;
    }
    onCommit(next);
  };

  return (
    <input
      aria-label="제목"
      placeholder="제목"
      value={value}
      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-fg outline-none"
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.currentTarget.blur();
      }}
    />
  );
}

function monthBlocks(days: DayColumn[]) {
  const blocks: { key: string; label: string; count: number }[] = [];
  for (const day of days) {
    const key = `${day.year}-${day.month}`;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) {
      last.count += 1;
      continue;
    }
    blocks.push({
      key,
      label: `${day.year}년 ${day.month}월`,
      count: 1,
    });
  }
  return blocks;
}

function monthStarts(days: DayColumn[], index: number) {
  const day = days[index];
  const previous = days[index - 1];
  if (!day) return false;
  if (!previous) return true;
  return previous.year !== day.year || previous.month !== day.month;
}

function clampSpan(span: DateSpan, limit: DateSpan | null) {
  if (!limit) return span;
  const start =
    span.start < limit.start ? limit.start : span.start > limit.end ? limit.end : span.start;
  const end = span.end > limit.end ? limit.end : span.end < limit.start ? limit.start : span.end;
  return orderedSpan(start, end);
}

function inSpan(date: string, span: DateSpan | null) {
  if (!span) return false;
  return date >= span.start && date <= span.end;
}

function spanBox(days: DayColumn[], span: DateSpan) {
  const start = days.findIndex((day) => day.date === span.start);
  const end = days.findIndex((day) => day.date === span.end);
  if (start < 0 || end < 0) return null;
  const from = Math.min(start, end);
  const count = Math.abs(end - start) + 1;
  return {
    left: `calc(${from} * 4rem + 0.25rem)`,
    width: `calc(${count} * 4rem - 0.5rem)`,
  };
}

function nudgeTimeline(el: HTMLElement | null, clientX: number) {
  if (!el) return;
  const box = el.getBoundingClientRect();
  if (clientX < box.left + 36) el.scrollLeft -= 18;
  else if (clientX > box.right - 36) el.scrollLeft += 18;
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

function withTag(tags: string[], raw: string) {
  const name = raw.trim().replace(/^#+/, "");
  if (!name || tags.includes(name)) return tags;
  return [...tags, name];
}

function columnWidth(el: HTMLElement) {
  return (
    el.querySelector<HTMLElement>("[data-day]")?.getBoundingClientRect()
      .width ?? 0
  );
}

function scrollTodayToCenter(el: HTMLElement) {
  const today = el.querySelector<HTMLElement>("[data-today]");
  if (!today) return;
  const view = el.getBoundingClientRect();
  const box = today.getBoundingClientRect();
  const left =
    box.left - view.left + el.scrollLeft - el.clientWidth / 2 + box.width / 2;
  el.scrollLeft = Math.max(0, left);
}

function publishToday(
  el: HTMLElement,
  setTodayInView: (value: boolean | ((current: boolean) => boolean)) => void,
) {
  const today = el.querySelector<HTMLElement>("[data-today]");
  if (!today) {
    setTodayInView(false);
    return;
  }
  const view = el.getBoundingClientRect();
  const box = today.getBoundingClientRect();
  const visible = box.right > view.left + 1 && box.left < view.right - 1;
  setTodayInView((current) => (current === visible ? current : visible));
}
