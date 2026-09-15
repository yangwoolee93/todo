import { FormEvent, useEffect, useRef, useState } from "react";
import { useUIStore } from "@renderer/stores/useUIStore";
import { useMemoStore, MEMO_CATEGORY_COLORS, memoColorLabel, memoColorVar, nextUnusedMemoColor } from "@renderer/features/memo";
import type { MemoCategory, MemoItem } from "@shared/types/memo";
import { Button, CloseIcon, Input, Modal, ModalTitle, Tab } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";

const fieldClass = cn(
  "w-full rounded-(--radius-btn) border border-border bg-surface px-3 py-2 text-sm text-fg",
  "placeholder:text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
);

/** 메모 화면 — 분류 필터·저장·조회 */
export default function MemoDesign() {
  const openAddModalWithDuplicate = useUIStore((s) => s.openAddModalWithDuplicate);
  const memos = useMemoStore((s) => s.memos);
  const categories = useMemoStore((s) => s.categories);
  const loading = useMemoStore((s) => s.loading);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const createMemo = useMemoStore((s) => s.createMemo);
  const updateMemo = useMemoStore((s) => s.updateMemo);
  const deleteMemo = useMemoStore((s) => s.deleteMemo);

  const [filterId, setFilterId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [opened, setOpened] = useState<MemoItem | null>(null);

  useEffect(() => {
    void loadMemos();
  }, [loadMemos]);

  useEffect(() => {
    if (filterId !== null && !categories.some((category) => category.id === filterId)) {
      setFilterId(null);
    }
  }, [categories, filterId]);

  const items =
    filterId === null ? memos : memos.filter((item) => item.category_id === filterId);
  const defaultCategoryId = filterId ?? categories[0]?.id ?? 0;

  const handleAdd = async (categoryId: number, title: string, note: string) => {
    const success = await createMemo({
      category_id: categoryId,
      title,
      note,
    });
    if (success) setAddOpen(false);
  };

  const handleSaveOpened = async (categoryId: number, title: string, note: string) => {
    if (!opened) return;
    const success = await updateMemo({
      id: opened.id,
      category_id: categoryId,
      title,
      note,
    });
    if (success) setOpened(null);
  };

  const handleRemoveOpened = async () => {
    if (!opened) return;
    const success = await deleteMemo(opened.id);
    if (success) setOpened(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="m-6 mb-2 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-medium text-fg">메모</h1>
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setManageOpen(true)}>
            관리
          </Button>
        </div>
        <div className="scrollbar min-w-0 overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex w-max gap-1" role="group" aria-label="메모 분류">
            <Tab className="shrink-0" active={filterId === null} onClick={() => setFilterId(null)}>
              전체
            </Tab>
            {categories.map((category) => (
              <Tab
                key={category.id}
                className="shrink-0 inline-flex items-center gap-1.5"
                active={filterId === category.id}
                onClick={() => setFilterId(category.id)}
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: memoColorVar(category.color) }}
                />
                {category.name}
              </Tab>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-6 mb-6 mt-4 flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          className="mb-3 w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg disabled:cursor-default disabled:opacity-50"
          disabled={categories.length === 0}
          onClick={() => setAddOpen(true)}
        >
          + 항목 추가
        </button>

        <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg-secondary">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="rounded-(--radius-btn) border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
              등록된 항목이 없습니다.
              <br />
              <span className="text-xs">상단 「항목 추가」로 등록하세요.</span>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="relative w-full rounded-(--radius-card) bg-surface py-3 pr-3 pl-6 text-left hover:bg-muted"
                    onClick={() => setOpened(item)}
                  >
                    <span
                      aria-hidden
                      className="absolute top-2.5 bottom-2.5 left-2.5 w-0.75 rounded-full"
                      style={{
                        backgroundColor: memoColorVar(
                          categories.find((category) => category.id === item.category_id)?.color,
                        ),
                      }}
                    />
                    {filterId === null ? (
                      <span className="mb-0.5 block text-xs text-fg-secondary">
                        {categoryName(categories, item.category_id)}
                      </span>
                    ) : null}
                    <span className="block text-sm font-medium leading-snug text-fg">
                      {item.title}
                    </span>
                    {item.note ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-fg-secondary line-clamp-2">
                        {item.note}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MemoAddModal
        open={addOpen}
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <MemoDetailModal
        open={opened !== null}
        categories={categories}
        item={opened}
        onClose={() => setOpened(null)}
        onSave={handleSaveOpened}
        onRemove={handleRemoveOpened}
        onPutOnSchedule={(title) => {
          openAddModalWithDuplicate(title);
          setOpened(null);
        }}
      />
      <CategoryManageModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  );
}

function categoryName(categories: MemoCategory[], id: number) {
  return categories.find((category) => category.id === id)?.name ?? "미분류";
}

function CategorySelect({
  id,
  value,
  categories,
  onChange,
}: {
  id: string;
  value: number;
  categories: MemoCategory[];
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: memoColorVar(
            categories.find((category) => category.id === value)?.color,
          ),
        }}
      />
      <select
        id={id}
        className={fieldClass}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function MemoAddModal({
  open,
  categories,
  defaultCategoryId,
  onClose,
  onAdd,
}: {
  open: boolean;
  categories: MemoCategory[];
  defaultCategoryId: number;
  onClose: () => void;
  onAdd: (categoryId: number, title: string, note: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const titleRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTitle("");
      setNote("");
      setCategoryId(defaultCategoryId);
      requestAnimationFrame(() => titleRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open, defaultCategoryId]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = title.trim();
    if (!next || !categoryId) return;
    onAdd(categoryId, next, note.trim());
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
          <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="memo-add-category">
            분류
          </label>
          <CategorySelect
            id="memo-add-category"
            value={categoryId}
            categories={categories}
            onChange={setCategoryId}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="memo-add-title">
            제목
          </label>
          <Input
            ref={titleRef}
            id="memo-add-title"
            value={title}
            placeholder="메모 제목"
            onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, ""))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="memo-add-note">
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
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || !categoryId}>
            추가
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MemoDetailModal({
  open,
  categories,
  item,
  onClose,
  onSave,
  onRemove,
  onPutOnSchedule,
}: {
  open: boolean;
  categories: MemoCategory[];
  item: MemoItem | null;
  onClose: () => void;
  onSave: (categoryId: number, title: string, note: string) => void;
  onRemove: () => void;
  onPutOnSchedule: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [editing, setEditing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current && item) {
      setTitle(item.title);
      setNote(item.note);
      setCategoryId(item.category_id);
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
    if (!next || !categoryId) return;
    onSave(categoryId, next, note.trim());
  };

  return (
    <Modal open={open} onClose={onClose} label="항목" size="md">
      <div className="mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">
          {item ? categoryName(categories, item.category_id) : "메모"}
        </ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-fg">{item?.title}</p>
          {item?.note ? (
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
              htmlFor="memo-edit-category"
            >
              분류
            </label>
            <CategorySelect
              id="memo-edit-category"
              value={categoryId}
              categories={categories}
              onChange={setCategoryId}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="memo-edit-title">
              제목
            </label>
            <Input
              ref={titleRef}
              id="memo-edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, ""))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="memo-edit-note">
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button type="button" variant="danger" className="text-sm" onClick={onRemove}>
              삭제
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim() || !categoryId}>
              저장
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CategoryColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-fg-secondary">색</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="분류 색">
        {MEMO_CATEGORY_COLORS.map((color) => {
          const selected = value === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={memoColorLabel(color)}
              aria-pressed={selected}
              className={cn(
                "size-5 rounded-full",
                selected
                  ? "ring-2 ring-fg ring-offset-2 ring-offset-surface"
                  : "hover:ring-2 hover:ring-border-strong hover:ring-offset-2 hover:ring-offset-surface",
              )}
              style={{ backgroundColor: memoColorVar(color) }}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>
    </div>
  );
}

type ManageView =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; category: MemoCategory }
  | { type: "delete"; category: MemoCategory };

function CategoryManageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useMemoStore((s) => s.categories);
  const memos = useMemoStore((s) => s.memos);
  const createCategory = useMemoStore((s) => s.createCategory);
  const updateCategory = useMemoStore((s) => s.updateCategory);
  const deleteCategory = useMemoStore((s) => s.deleteCategory);
  const error = useMemoStore((s) => s.error);
  const clearError = useMemoStore((s) => s.clearError);

  const [view, setView] = useState<ManageView>({ type: "list" });
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(MEMO_CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  const goList = () => {
    setView({ type: "list" });
    setName("");
    clearError();
  };

  const openCreate = () => {
    setName("");
    setColor(nextUnusedMemoColor(categories.map((category) => category.color)));
    setView({ type: "create" });
    clearError();
  };

  const openEdit = (category: MemoCategory) => {
    setName(category.name);
    setColor(category.color);
    setView({ type: "edit", category });
    clearError();
  };

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      goList();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (view.type === "create" || view.type === "edit") {
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [view.type]);

  useEffect(() => {
    if (view.type !== "edit" && view.type !== "delete") return;
    const exists = categories.some((category) => category.id === view.category.id);
    if (!exists) goList();
  }, [categories, view]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (!next || saving) return;
    setSaving(true);
    const success = await createCategory(next, color);
    setSaving(false);
    if (success) goList();
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (view.type !== "edit") return;
    const next = name.trim();
    if (!next || saving) return;
    setSaving(true);
    const success = await updateCategory(view.category.id, next, color);
    setSaving(false);
    if (success) goList();
  };

  const handleDelete = async () => {
    if (view.type !== "delete" || saving) return;
    setSaving(true);
    const success = await deleteCategory(view.category.id);
    setSaving(false);
    if (success) goList();
  };

  const title =
    view.type === "create"
      ? "분류 추가"
      : view.type === "edit"
        ? "분류 수정"
        : view.type === "delete"
          ? "분류 삭제"
          : "분류 관리";

  const fallback =
    view.type === "delete"
      ? categories.find((category) => category.id !== view.category.id)
      : undefined;
  const pendingCount =
    view.type === "delete"
      ? memos.filter((item) => item.category_id === view.category.id).length
      : 0;

  return (
    <Modal open={open} onClose={onClose} label={title} size="md">
      <div className="mb-4 flex items-center justify-between">
        <ModalTitle className="text-lg font-semibold text-fg">{title}</ModalTitle>
        <Button variant="ghost" className="p-1.5" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </Button>
      </div>

      {view.type === "list" ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="w-full shrink-0 rounded-(--radius-card) bg-surface px-3 py-3 text-left text-sm text-fg-secondary hover:bg-muted hover:text-fg"
            onClick={openCreate}
          >
            + 분류 추가
          </button>
          <ul className="flex flex-col gap-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-(--radius-card) bg-surface px-3 py-3"
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: memoColorVar(category.color) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{category.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 text-sm"
                  onClick={() => openEdit(category)}
                >
                  수정
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.type === "create" ? (
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleCreate(event)}>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="category-add-name">
              이름
            </label>
            <Input
              ref={nameRef}
              id="category-add-name"
              value={name}
              placeholder="분류 이름"
              onChange={(event) => setName(event.target.value.replace(/[\r\n]+/g, ""))}
            />
          </div>
          <CategoryColorField value={color} onChange={setColor} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={goList}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim() || saving}>
              추가
            </Button>
          </div>
        </form>
      ) : null}

      {view.type === "edit" ? (
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSave(event)}>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="category-edit-name">
              이름
            </label>
            <Input
              ref={nameRef}
              id="category-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value.replace(/[\r\n]+/g, ""))}
            />
          </div>
          <CategoryColorField value={color} onChange={setColor} />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="danger"
              className="text-sm"
              disabled={categories.length <= 1}
              onClick={() => setView({ type: "delete", category: view.category })}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={goList}>
                취소
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim() || saving}>
                저장
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {view.type === "delete" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-secondary">
            <strong className="text-fg">{view.category.name}</strong> 분류를 삭제합니다.
          </p>
          {pendingCount > 0 && fallback ? (
            <p className="rounded-(--radius-btn) bg-muted px-3 py-2 text-xs text-fg-secondary">
              이 분류의 메모 {pendingCount}개가{" "}
              <strong className="text-fg">{fallback.name}</strong>으로 옮겨집니다.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => openEdit(view.category)}>
              취소
            </Button>
            <Button type="button" variant="danger" disabled={saving} onClick={() => void handleDelete()}>
              삭제
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
