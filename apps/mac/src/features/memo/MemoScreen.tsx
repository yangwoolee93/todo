import {
  DotsThreeIcon,
  PlusIcon,
  PushPinIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { GlassButton } from "../../components/GlassButton";
import {
  DetailPanelBody,
  DetailPanelMenuBody,
} from "../detail/DetailPanelSlot";
import { useDetailPanelStore } from "../../stores/useDetailPanelStore";
import { useMemoStore, type MemoItem } from "../../stores/useMemoStore";
import { cn } from "../../utils/cn";

type DraftValue = { title: string; body: string; tags: string[] };

type PanelView =
  | { kind: "create" }
  | { kind: "detail"; id: string }
  | { kind: "edit"; id: string };

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function MemoScreen({ pageId }: { pageId: string }) {
  const memos = useMemoStore((state) => state.memos);
  const addMemo = useMemoStore((state) => state.addMemo);
  const updateMemo = useMemoStore((state) => state.updateMemo);
  const removeMemo = useMemoStore((state) => state.removeMemo);
  const [pinOnly, setPinOnly] = useState(false);
  const [view, setView] = useState<PanelView | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pageMemos = memos.filter((memo) => memo.pageId === pageId);
  const visible = sortMemos(pageMemos).filter(
    (memo) => !pinOnly || memo.pinned,
  );
  const opened =
    view && view.kind !== "create"
      ? (pageMemos.find((memo) => memo.id === view.id) ?? null)
      : null;

  useEffect(() => {
    return () => {
      useDetailPanelStore.getState().closePanel();
    };
  }, []);

  useEffect(() => {
    if (view) useDetailPanelStore.getState().openPanel();
    else useDetailPanelStore.getState().closePanel();
  }, [view]);

  useEffect(() => {
    if (view && view.kind !== "create" && !opened) setView(null);
  }, [view, opened]);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [opened?.id, view?.kind]);

  useEffect(() => {
    return useDetailPanelStore.subscribe((state, previous) => {
      if (previous.open && !state.open) setView(null);
    });
  }, []);

  const saveDraft = (draft: DraftValue) => {
    const id = addMemo(pageId, draft);
    setView({ kind: "detail", id });
  };

  const saveEdit = (draft: DraftValue) => {
    if (!opened) return;
    updateMemo(opened.id, draft);
    setView({ kind: "detail", id: opened.id });
  };

  const duplicateMemo = () => {
    if (!opened) return;
    const id = addMemo(pageId, {
      title: copyTitle(opened.title),
      body: opened.body,
      tags: [...opened.tags],
    });
    setView({ kind: "detail", id });
  };

  const deleteMemo = () => {
    if (!opened) return;
    removeMemo(opened.id);
    setConfirmingDelete(false);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <GlassButton
          data-opens-detail
          className="gap-1 px-3 py-1.5 text-sm"
          onClick={() => setView({ kind: "create" })}
        >
          <PlusIcon aria-hidden="true" size={16} weight="light" />
          메모 추가
        </GlassButton>
        <button
          type="button"
          aria-pressed={pinOnly}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm",
            pinOnly ? "bg-fg/10 text-fg" : "text-fg-secondary hover:bg-fg/5",
          )}
          onClick={() => setPinOnly((value) => !value)}
        >
          핀만
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-fg-secondary">
          {pinOnly ? "핀한 메모가 없습니다." : "메모가 없습니다."}
        </p>
      ) : (
        <div
          className="mt-4 grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2"
          style={{ gridAutoRows: "1px" }}
        >
          {visible.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              selected={memo.id === opened?.id}
              onOpen={() => setView({ kind: "detail", id: memo.id })}
            />
          ))}
        </div>
      )}
      {view?.kind === "create" && (
        <DetailPanelBody>
          <MemoDraft
            onSave={saveDraft}
            onCancel={() => useDetailPanelStore.getState().closePanel()}
          />
        </DetailPanelBody>
      )}
      {view?.kind === "edit" && opened && (
        <DetailPanelBody>
          <MemoDraft
            key={opened.id}
            initial={{
              title: opened.title,
              body: opened.body,
              tags: opened.tags,
            }}
            onSave={saveEdit}
            onCancel={() => setView({ kind: "detail", id: opened.id })}
          />
        </DetailPanelBody>
      )}
      {view?.kind === "detail" && opened && (
        <>
          <DetailPanelMenuBody>
            <MemoMenu
              onEdit={() => setView({ kind: "edit", id: opened.id })}
              onDuplicate={duplicateMemo}
              onDelete={() => setConfirmingDelete(true)}
            />
          </DetailPanelMenuBody>
          <DetailPanelBody>
            <MemoDetail memo={opened} />
          </DetailPanelBody>
        </>
      )}
      {confirmingDelete &&
        createPortal(
          <MemoDeleteConfirm
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={deleteMemo}
          />,
          document.body,
        )}
    </div>
  );
}

function MemoCard({
  memo,
  selected,
  onOpen,
}: {
  memo: MemoItem;
  selected: boolean;
  onOpen: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const item = itemRef.current;
    const content = contentRef.current;
    if (!item || !content) return;
    const measure = () => {
      const grid = item.parentElement;
      const button = content.parentElement;
      if (!grid || !button) return;
      const style = getComputedStyle(grid);
      const buttonStyle = getComputedStyle(button);
      const rowHeight = Number.parseFloat(style.gridAutoRows) || 1;
      const rowGap = Number.parseFloat(style.rowGap) || 0;
      const chrome =
        Number.parseFloat(buttonStyle.paddingTop) +
        Number.parseFloat(buttonStyle.paddingBottom) +
        Number.parseFloat(buttonStyle.borderTopWidth) +
        Number.parseFloat(buttonStyle.borderBottomWidth);
      const height = content.getBoundingClientRect().height + chrome;
      const span = Math.max(
        1,
        Math.ceil((height + rowGap) / (rowHeight + rowGap)),
      );
      item.style.gridRowEnd = `span ${span}`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  });

  return (
    <div ref={itemRef} className="flex">
      <button
        type="button"
        data-opens-detail
        className={cn(
          "flex h-full w-full flex-col rounded-xl border bg-surface p-2.5 text-left",
          selected ? "border-accent" : "border-border",
        )}
        onClick={onOpen}
      >
        <span ref={contentRef} className="flex flex-col">
          <span className="flex items-start gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-sm font-medium",
                memo.title.trim() ? "text-fg" : "text-fg-muted",
              )}
            >
              {memo.title.trim() || "제목 없음"}
            </span>
            {memo.pinned && (
              <PushPinIcon
                aria-hidden="true"
                className="shrink-0 text-accent"
                size={14}
                weight="fill"
              />
            )}
          </span>
          {memo.body.trim() && (
            <span className="mt-1 line-clamp-12 whitespace-pre-wrap break-words text-xs text-fg-secondary">
              {memo.body.trim()}
            </span>
          )}
          {memo.tags.length > 0 && (
            <span className="mt-1 break-words text-xs text-fg-secondary">
              {memo.tags.map((tag) => `#${tag}`).join(" ")}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

function MemoDetail({ memo }: { memo: MemoItem }) {
  const togglePin = useMemoStore((state) => state.togglePin);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <h2
          className={cn(
            "min-w-0 flex-1 text-base font-medium",
            memo.title.trim() ? "text-fg" : "text-fg-muted",
          )}
        >
          {memo.title.trim() || "제목 없음"}
        </h2>
        <button
          type="button"
          aria-label={memo.pinned ? "핀 해제" : "핀"}
          aria-pressed={memo.pinned}
          className="flex shrink-0 rounded-full p-1 hover:bg-fg/10"
          onClick={() => togglePin(memo.id)}
        >
          <PushPinIcon
            aria-hidden="true"
            size={16}
            weight={memo.pinned ? "fill" : "regular"}
            className={memo.pinned ? "text-accent" : "text-fg-secondary"}
          />
        </button>
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap text-sm",
          memo.body.trim() ? "text-fg" : "text-fg-muted",
        )}
      >
        {memo.body.trim() || "내용 없음"}
      </p>
      {memo.tags.length > 0 && (
        <p className="text-xs text-fg-secondary">
          {memo.tags.map((tag) => `#${tag}`).join(" ")}
        </p>
      )}
      <dl className="flex flex-col gap-1 text-xs text-fg-secondary">
        <div>작성 {dateFormat.format(memo.createdAt)}</div>
        <div>수정 {dateFormat.format(memo.updatedAt)}</div>
      </dl>
    </div>
  );
}

function MemoMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <GlassButton
        aria-label="메뉴"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex p-2 hover:bg-fg/10"
        onClick={() => setOpen((value) => !value)}
      >
        <DotsThreeIcon aria-hidden="true" size={20} weight="bold" />
      </GlassButton>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 flex w-28 flex-col rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-left text-xs text-fg hover:bg-fg/10"
            onClick={() => choose(onEdit)}
          >
            수정
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-left text-xs text-fg hover:bg-fg/10"
            onClick={() => choose(onDelete)}
          >
            삭제
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-left text-xs text-fg hover:bg-fg/10"
            onClick={() => choose(onDuplicate)}
          >
            복제
          </button>
        </div>
      )}
    </div>
  );
}

function MemoDeleteConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/80"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-delete-title"
        className="w-72 rounded-2xl border border-border bg-surface p-4"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="memo-delete-title" className="text-sm text-fg">
          내용이 있는데 삭제하시겠습니까?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GlassButton
            className="px-3 py-1.5 text-sm"
            onClick={onCancel}
            autoFocus
          >
            취소
          </GlassButton>
          <GlassButton className="px-3 py-1.5 text-sm" onClick={onConfirm}>
            삭제
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

function MemoDraft({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftValue;
  onSave: (draft: DraftValue) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState<string[]>(() => [...(initial?.tags ?? [])]);
  const [draft, setDraft] = useState("");
  const ready = Boolean(
    title.trim() || body.trim() || withTag(tags, draft).length,
  );

  const commitDraft = () => {
    setTags((current) => withTag(current, draft));
    setDraft("");
  };

  const saveDraft = () => {
    const nextTags = withTag(tags, draft);
    if (!title.trim() && !body.trim() && nextTags.length === 0) return;
    onSave({ title: title.trim(), body: body.trim(), tags: nextTags });
  };

  const saveFromKey = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    saveDraft();
  };

  const keepTitle = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
    }
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) return;
    if (event.key === "Enter" && !draft.trim()) {
      event.preventDefault();
      saveDraft();
      return;
    }
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      setTags((current) => current.slice(0, -1));
    }
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDraft();
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={save}
      onKeyDown={saveFromKey}
    >
      <input
        autoFocus
        aria-label="제목"
        value={title}
        placeholder="제목"
        className="w-full rounded-lg bg-fg/5 px-2 py-1 text-sm font-medium text-fg outline-none placeholder:text-fg-muted"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={keepTitle}
      />
      <textarea
        aria-label="내용"
        value={body}
        placeholder="내용"
        rows={6}
        className="w-full resize-none rounded-lg bg-fg/5 px-2 py-1 text-sm text-fg outline-none placeholder:text-fg-muted"
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-fg/5 px-2 py-0.5 text-xs text-fg-secondary"
          >
            #{tag}
            <button
              type="button"
              aria-label={`${tag} 삭제`}
              className="flex rounded-full p-0.5 hover:bg-fg/10"
              onClick={() =>
                setTags((current) => current.filter((item) => item !== tag))
              }
            >
              <XIcon aria-hidden="true" size={10} weight="bold" />
            </button>
          </span>
        ))}
        <input
          aria-label="해시태그"
          value={draft}
          placeholder="태그"
          className="min-w-16 flex-1 bg-transparent px-1 py-0.5 text-xs text-fg outline-none placeholder:text-fg-muted"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onTagKeyDown}
          onBlur={commitDraft}
        />
      </div>
      <div className="mt-1 flex justify-end gap-1">
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs text-fg-secondary hover:bg-fg/10"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="rounded-full px-2 py-1 text-xs text-fg hover:bg-fg/10 disabled:pointer-events-none disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </form>
  );
}

function sortMemos(memos: MemoItem[]) {
  return [...memos].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) return (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0);
    return b.updatedAt - a.updatedAt;
  });
}

function copyTitle(title: string) {
  const name = title.trim();
  const numbered = name.match(/^(.*) 복사본 (\d+)$/);
  if (numbered) {
    const base = numbered[1];
    const count = Number(numbered[2]) + 1;
    return base ? `${base} 복사본 ${count}` : `복사본 ${count}`;
  }
  if (name.endsWith(" 복사본")) return `${name} 2`;
  if (name === "복사본" || name.startsWith("복사본 ")) {
    const count =
      name === "복사본" ? 2 : Number(name.slice("복사본 ".length)) + 1;
    return Number.isInteger(count) ? `복사본 ${count}` : `${name} 복사본`;
  }
  if (!name) return "복사본";
  return `${name} 복사본`;
}

function withTag(tags: string[], raw: string) {
  const name = raw.trim().replace(/^#+/, "");
  if (!name || tags.includes(name)) return tags;
  return [...tags, name];
}
