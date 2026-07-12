import type { TodoStatus } from "@shared/types/todo";

interface TodoStatusIconProps {
  status: TodoStatus;
  className?: string;
}

/** SVG 둥근 네모 아이콘 공통 치수 */
const BOX = { x: 3, y: 3, size: 14, radius: 3 };

/**
 * 투두 상태 아이콘 (둥근 네모)
 * - pending: 빈 테두리
 * - completed: success 채움 + 흰색 ✓
 * - failed: failed 테두리 + ✕
 */
export function TodoStatusIcon({ status, className = "h-5 w-5 shrink-0" }: TodoStatusIconProps) {
  if (status === "completed") {
    return (
      <svg
        className={`${className} text-success`}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x={BOX.x}
          y={BOX.y}
          width={BOX.size}
          height={BOX.size}
          rx={BOX.radius}
          ry={BOX.radius}
          fill="currentColor"
        />
        <path
          d="M6.5 10.2 8.8 12.5 13.5 7.8"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "failed") {
    return (
      <svg
        className={`${className} text-failed`}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x={BOX.x}
          y={BOX.y}
          width={BOX.size}
          height={BOX.size}
          rx={BOX.radius}
          ry={BOX.radius}
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7.2 7.2 12.8 12.8M12.8 7.2 7.2 12.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${className} text-fg-muted`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x={BOX.x}
        y={BOX.y}
        width={BOX.size}
        height={BOX.size}
        rx={BOX.radius}
        ry={BOX.radius}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** 상태별 투두 텍스트 Tailwind 클래스 (1차 상세 수정안 B안) */
export function getTodoTextClass(status: TodoStatus): string {
  switch (status) {
    case "completed":
      return "text-success line-through opacity-70";
    case "failed":
      return "text-failed line-through border-l-2 border-failed pl-2";
    default:
      return "text-fg";
  }
}
