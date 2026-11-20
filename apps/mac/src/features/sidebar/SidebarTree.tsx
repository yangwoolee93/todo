import { CaretRightIcon, PlusIcon, SidebarIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { cn } from "../../utils/cn";
import {
  useSidebarStore,
  type SidebarGroup,
  type SidebarPage,
} from "../../stores/useSidebarStore";
import { pageIcons, pageTypes, type PageTypeId } from "./pageTypes";

type Draft = { kind: "group" } | null;

function NameField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={label}
      aria-label={label}
      autoFocus
      className="w-full rounded-lg bg-fg/5 px-2 py-1 text-sm text-fg outline-none placeholder:text-fg-muted"
    />
  );
}

function TimelineFields({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (value: string) => void;
}) {
  return <NameField value={name} onChange={onNameChange} label="이름" />;
}

function MemoFields({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (value: string) => void;
}) {
  return <NameField value={name} onChange={onNameChange} label="이름" />;
}

const fieldsByType = {
  timeline: TimelineFields,
  memo: MemoFields,
} satisfies Record<PageTypeId, typeof TimelineFields>;

function TypePicker({
  value,
  onChange,
}: {
  value: PageTypeId;
  onChange: (value: PageTypeId) => void;
}) {
  return (
    <div className="flex gap-1">
      {pageTypes.map((type) => (
        <button
          key={type.id}
          type="button"
          className={cn(
            "rounded-full px-2 py-1 text-xs",
            value === type.id
              ? "bg-fg/15 text-fg"
              : "text-fg-secondary hover:bg-fg/10",
          )}
          onClick={() => onChange(type.id)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

function FormActions({
  submitLabel,
  disabled,
  onCancel,
}: {
  submitLabel: string;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        className="rounded-full px-2 py-1 text-xs text-fg-secondary hover:bg-fg/10"
        onClick={onCancel}
      >
        취소
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-full px-2 py-1 text-xs text-fg hover:bg-fg/10 disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function AddGroupForm({ onClose }: { onClose: () => void }) {
  const addGroup = useSidebarStore((state) => state.addGroup);
  const [name, setName] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addGroup(name);
    onClose();
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-xl bg-fg/5 p-2"
      onSubmit={submit}
    >
      <NameField value={name} onChange={setName} label="프로젝트 이름" />
      <FormActions
        submitLabel="추가"
        disabled={!name.trim()}
        onCancel={onClose}
      />
    </form>
  );
}

export function AddPageForm({
  groupId,
  onClose,
}: {
  groupId: string;
  onClose: () => void;
}) {
  const addPage = useSidebarStore((state) => state.addPage);
  const [type, setType] = useState<PageTypeId>("timeline");
  const [name, setName] = useState("");
  const Fields = fieldsByType[type];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addPage(groupId, type, name);
    onClose();
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-xl bg-fg/5 p-2"
      onSubmit={submit}
    >
      <TypePicker value={type} onChange={setType} />
      <Fields key={type} name={name} onNameChange={setName} />
      <FormActions
        submitLabel="추가"
        disabled={!name.trim()}
        onCancel={onClose}
      />
    </form>
  );
}

function GroupBlock({
  group,
  pages,
  selectedPageId,
  selectedGroupId,
}: {
  group: SidebarGroup;
  pages: SidebarPage[];
  selectedPageId: string | null;
  selectedGroupId: string | null;
}) {
  const toggleGroup = useSidebarStore((state) => state.toggleGroup);
  const selectProject = useSidebarStore((state) => state.selectProject);
  const selectPage = useSidebarStore((state) => state.selectPage);
  const selectedChildHidden =
    group.collapsed && pages.some((page) => page.id === selectedPageId);

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-lg px-2",
          selectedGroupId === group.id || selectedChildHidden
            ? "bg-fg/10"
            : "hover:bg-fg/5",
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center px-1.5 py-2.5 text-left"
          onClick={() => selectProject(group.id)}
        >
          <span className="truncate font-medium text-fg">{group.name}</span>
        </button>
        <button
          type="button"
          aria-label={group.collapsed ? "하위 목록 열기" : "하위 목록 닫기"}
          className="shrink-0 rounded-md p-1.5 text-fg-secondary hover:bg-fg/10"
          onClick={() => toggleGroup(group.id)}
        >
          <CaretRightIcon
            size={16}
            className={cn(
              "transition-transform",
              !group.collapsed && "rotate-90",
            )}
          />
        </button>
      </div>

      {!group.collapsed &&
        pages.map((page) => {
          const PageIcon = pageIcons[page.type];
          return (
            <div
              key={page.id}
              className={cn(
                "flex items-center rounded-lg pl-6",
                selectedPageId === page.id ? "bg-fg/10" : "hover:bg-fg/5",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 py-2 text-left text-fg"
                onClick={() => selectPage(page.id)}
              >
                <PageIcon
                  aria-hidden="true"
                  size={16}
                  className="shrink-0 text-fg-secondary"
                />
                <span className="truncate">{page.name}</span>
              </button>
            </div>
          );
        })}
    </div>
  );
}

export function SidebarTree({ onToggle }: { onToggle: () => void }) {
  const groups = useSidebarStore((state) => state.groups);
  const pages = useSidebarStore((state) => state.pages);
  const selectedPageId = useSidebarStore((state) => state.selectedPageId);
  const selectedGroupId = useSidebarStore((state) => state.selectedGroupId);
  const [draft, setDraft] = useState<Draft>(null);
  const addingGroup = draft?.kind === "group";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 사이드바 헤더 */}
      <div className="pointer-events-none flex h-11 shrink-0 items-center justify-end gap-1 px-2">
        <div className="group/add pointer-events-auto relative">
          <button
            type="button"
            aria-label="프로젝트 추가"
            aria-expanded={addingGroup}
            className="flex rounded-full p-1 text-fg hover:bg-fg/10"
            onClick={() => setDraft(addingGroup ? null : { kind: "group" })}
          >
            <PlusIcon size={22} weight="light" />
          </button>
          {!addingGroup && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-full top-1/2 z-20 mr-1 hidden -translate-y-1/2 rounded-md bg-fg px-2 py-1 text-xs whitespace-nowrap text-base group-hover/add:block"
            >
              프로젝트 추가
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="사이드바 닫기"
          className="pointer-events-auto flex rounded-full p-1 text-fg hover:bg-fg/10"
          onClick={onToggle}
        >
          <SidebarIcon aria-hidden="true" size={22} weight="light" />
        </button>
      </div>
      {/* 프로젝트 추가 폼 */}
      {addingGroup && (
        <div className="pointer-events-auto px-2 pb-2">
          <AddGroupForm onClose={() => setDraft(null)} />
        </div>
      )}
      {/* 프로젝트 및 하위 목록 */}
      <div className="scrollbar pointer-events-auto flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 pb-2">
        {groups.map((group) => (
          <GroupBlock
            key={group.id}
            group={group}
            pages={pages.filter((page) => page.groupId === group.id)}
            selectedPageId={selectedPageId}
            selectedGroupId={selectedGroupId}
          />
        ))}
      </div>
    </div>
  );
}
