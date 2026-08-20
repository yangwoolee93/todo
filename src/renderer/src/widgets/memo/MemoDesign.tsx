import { FormEvent, useEffect, useRef, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMemoStore } from "@renderer/features/memo";
import type { MemoItem, MemoKind } from "@shared/types/memo";
import { Button, Card, CloseIcon, Input, Modal, ModalTitle, Tab } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";

const fieldClass = cn(
  "w-full rounded-(--radius-btn) border border-border bg-surface px-3 py-2 text-sm text-fg",
  "placeholder:text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
);

/** 메모 화면 — 루틴/예정 저장·조회 */
export default function MemoDesign() {
  const openAddModalWithDuplicate = useUIStore((s) => s.openAddModalWithDuplicate);
  const memos = useMemoStore((s) => s.memos);
  const loading = useMemoStore((s) => s.loading);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const createMemo = useMemoStore((s) => s.createMemo);
  const updateMemo = useMemoStore((s) => s.updateMemo);
  const deleteMemo = useMemoStore((s) => s.deleteMemo);

  const [kind, setKind] = useState<MemoKind>("routine");
  const [addOpen, setAddOpen] = useState(false);
  const [opened, setOpened] = useState<MemoItem | null>(null);

  useEffect(() => {
    void loadMemos();
  }, [loadMemos]);

  const items = memos.filter((item) => item.kind === kind);
  const heading = kind === "routine" ? "루틴" : "예정";
  const hint =
    kind === "routine" ? "반복해서 쓰는 할 일 제목입니다." : "아직 날짜가 없는 할 일·메모입니다.";

  const handleAdd = async (title: string, note: string) => {
    const success = await createMemo({
      kind,
      title,
      note: kind === "planned" ? note : "",
    });
    if (success) setAddOpen(false);
  };

  const handleSaveOpened = async (title: string, note: string) => {
    if (!opened) return;
    const success = await updateMemo({
      id: opened.id,
      title,
      note: kind === "planned" ? note : "",
    });
    if (success) setOpened(null);
  };

  const handleRemoveOpened = async () => {
    if (!opened) return;
    const success = await deleteMemo(opened.id);
    if (success) setOpened(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <Card className="shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex w-fit gap-1" role="group" aria-label="메모 종류">
                <Tab
                  active={kind === "routine"}
                  className="px-2.5 py-0.5 text-xs"
                  onClick={() => setKind("routine")}
                >
                  루틴
                </Tab>
                <Tab
                  active={kind === "planned"}
                  className="px-2.5 py-0.5 text-xs"
                  onClick={() => setKind("planned")}
                >
                  예정
                </Tab>
              </div>
              <h2 className="text-xl font-semibold text-fg">{heading}</h2>
              <p className="text-xs text-fg-secondary">{hint}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-secondary">{items.length}건의 항목</p>
            <Button variant="primary" className="text-sm" onClick={() => setAddOpen(true)}>
              항목 추가
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="scrollbar min-h-0 flex-1 overflow-auto p-4">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-secondary">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
              등록된 항목이 없습니다.
              <br />
              <span className="text-xs">상단 「항목 추가」로 등록하세요.</span>
            </p>
          ) : (
            <div className="grid grid-cols-3 items-start gap-3">
              {[0, 1, 2].map((col) => (
                <ul key={col} className="flex min-w-0 flex-col gap-3">
                  {items
                    .filter((_, index) => index % 3 === col)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full max-h-36 overflow-hidden rounded-(--radius-card) border border-border bg-surface p-3 text-left",
                            "transition-colors hover:bg-muted/20",
                          )}
                          onClick={() => setOpened(item)}
                        >
                          <p className="text-sm font-medium text-fg">{item.title}</p>
                          {kind === "planned" && item.note ? (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-fg-secondary">
                              {item.note}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
                </ul>
              ))}
            </div>
          )}
        </div>
      </Card>

      <MemoAddModal
        open={addOpen}
        kind={kind}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <MemoDetailModal
        open={opened !== null}
        kind={kind}
        item={opened}
        onClose={() => setOpened(null)}
        onSave={handleSaveOpened}
        onRemove={handleRemoveOpened}
        onPutOnSchedule={(title) => {
          openAddModalWithDuplicate(title);
          setOpened(null);
        }}
      />
    </div>
  );
}

function MemoAddModal({
  open,
  kind,
  onClose,
  onAdd,
}: {
  open: boolean;
  kind: MemoKind;
  onClose: () => void;
  onAdd: (title: string, note: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTitle("");
      setNote("");
      requestAnimationFrame(() => titleRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = title.trim();
    if (!next) return;
    onAdd(next, note.trim());
  };

  return (
    <Modal open={open} onClose={onClose} label="항목 추가" size="md">
      <div className="mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">항목 추가</ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-1 block text-xs font-medium text-fg-secondary"
            htmlFor="memo-add-title"
          >
            제목
          </label>
          <Input
            ref={titleRef}
            id="memo-add-title"
            value={title}
            placeholder={kind === "routine" ? "루틴 제목" : "예정 제목"}
            onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, ""))}
          />
        </div>
        {kind === "planned" && (
          <div>
            <label
              className="mb-1 block text-xs font-medium text-fg-secondary"
              htmlFor="memo-add-note"
            >
              메모 (선택)
            </label>
            <textarea
              id="memo-add-note"
              rows={4}
              value={note}
              placeholder="적어 둘 내용"
              className={cn(fieldClass, "resize-none")}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            추가
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MemoDetailModal({
  open,
  kind,
  item,
  onClose,
  onSave,
  onRemove,
  onPutOnSchedule,
}: {
  open: boolean;
  kind: MemoKind;
  item: MemoItem | null;
  onClose: () => void;
  onSave: (title: string, note: string) => void;
  onRemove: () => void;
  onPutOnSchedule: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current && item) {
      setTitle(item.title);
      setNote(item.note);
      setEditing(false);
    }
    wasOpenRef.current = open;
  }, [open, item]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [editing]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = title.trim();
    if (!next) return;
    onSave(next, note.trim());
  };

  return (
    <Modal open={open} onClose={onClose} label="항목" size="md">
      <div className="mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">
          {kind === "routine" ? "루틴" : "예정"}
        </ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-fg">{item?.title}</p>
          {kind === "planned" && item?.note ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-secondary">
              {item.note}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
              수정
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!item?.title}
              onClick={() => item && onPutOnSchedule(item.title)}
            >
              일정에 넣기
            </Button>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-fg-secondary"
              htmlFor="memo-edit-title"
            >
              제목
            </label>
            <Input
              ref={titleRef}
              id="memo-edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, ""))}
            />
          </div>
          {kind === "planned" && (
            <div>
              <label
                className="mb-1 block text-xs font-medium text-fg-secondary"
                htmlFor="memo-edit-note"
              >
                메모
              </label>
              <textarea
                id="memo-edit-note"
                rows={5}
                value={note}
                placeholder="적어 둘 내용"
                className={cn(fieldClass, "resize-none")}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button type="button" variant="danger" className="text-sm" onClick={onRemove}>
              삭제
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim()}>
              저장
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
