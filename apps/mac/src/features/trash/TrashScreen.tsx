import { useState } from "react";
import { GlassButton } from "../../components/GlassButton";
import { useMemoStore } from "../../stores/useMemoStore";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { useTimelineStore } from "../../stores/useTimelineStore";
import { emptyTrash, purgeRow, restoreRow, trashRows, type TrashRow } from "./trash";

const deletedFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const kindLabel = {
  group: "프로젝트",
  page: "페이지",
  memo: "메모",
  series: "할일",
} as const;

type Pending = { kind: "one"; row: TrashRow } | { kind: "all" };

export function TrashScreen() {
  const groups = useSidebarStore((state) => state.groups);
  const pages = useSidebarStore((state) => state.pages);
  const memos = useMemoStore((state) => state.memos);
  const todos = useTimelineStore((state) => state.todos);
  const rows = trashRows(groups, pages, memos, todos);
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "all") emptyTrash();
    else purgeRow(pending.row);
    setPending(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-medium text-fg">휴지통</h1>
        {rows.length > 0 && (
          <button
            type="button"
            className="ml-auto rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10"
            onClick={() => setPending({ kind: "all" })}
          >
            비우기
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-fg-secondary">휴지통이 비어 있습니다.</p>
      ) : (
        <ul className="scrollbar mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {rows.map((row) => (
            <li
              key={`${row.kind}-${row.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{row.title}</p>
                <p className="mt-1 truncate text-xs text-fg-secondary">
                  {[
                    kindLabel[row.kind],
                    row.place === kindLabel[row.kind] ? null : row.place,
                    deletedFormat.format(row.deletedAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full pad-xs text-xs text-fg hover:bg-fg/10"
                onClick={() => restoreRow(row)}
              >
                복원
              </button>
              <button
                type="button"
                className="shrink-0 rounded-full pad-xs text-xs text-fg-secondary hover:bg-fg/10"
                onClick={() => setPending({ kind: "one", row })}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-fg/20"
          onMouseDown={() => setPending(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trash-purge-title"
            className="dialog-sm rounded-2xl border border-border bg-surface"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p id="trash-purge-title" className="text-sm text-fg">
              {pending.kind === "all"
                ? "휴지통을 비우시겠습니까?"
                : "휴지통에서 완전히 삭제하시겠습니까?"}
            </p>
            <div className="mt-[1.143em] flex justify-end gap-[0.571em]">
              <GlassButton className="pad-sm text-sm" onClick={() => setPending(null)} autoFocus>
                취소
              </GlassButton>
              <GlassButton className="pad-sm text-sm" onClick={confirm}>
                삭제
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
