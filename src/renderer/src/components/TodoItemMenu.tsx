import { useEffect, useRef, useState } from "react";
import type { DisplayTodo, TodoStatus } from "@shared/types/todo";

interface TodoItemMenuProps {
  todo: DisplayTodo;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetStatus: (status: TodoStatus) => void;
}

/** 세로 점 3개 — 더보기(케밥) 메뉴 */
function MoreVerticalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}

/**
 * 투두 행 ⋮ 더보기 메뉴
 * - 실패/재시도는 여기서만 (아이콘 클릭과 분리)
 */
export function TodoItemMenu({
  todo,
  onEdit,
  onDuplicate,
  onDelete,
  onSetStatus,
}: TodoItemMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /** 메뉴 바깥 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /** 메뉴 항목 실행 후 드롭다운 닫기 */
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="btn btn-ghost p-1.5"
        aria-label="더보기"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVerticalIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-(--radius-btn) border border-border bg-surface py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-fg hover:bg-muted"
            role="menuitem"
            onClick={() => run(onEdit)}
          >
            수정
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-fg hover:bg-muted"
            role="menuitem"
            onClick={() => run(onDuplicate)}
          >
            복제
          </button>

          {todo.status !== "failed" && (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-failed hover:bg-failed-soft"
              role="menuitem"
              onClick={() => run(() => onSetStatus("failed"))}
            >
              실패로 표시
            </button>
          )}

          {todo.status === "failed" && (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-fg hover:bg-muted"
              role="menuitem"
              onClick={() => run(() => onSetStatus("pending"))}
            >
              다시 시도
            </button>
          )}

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
            role="menuitem"
            onClick={() => run(onDelete)}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
