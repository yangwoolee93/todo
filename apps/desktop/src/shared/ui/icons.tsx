import { cn } from "@renderer/utils/cn";

/** 좌측 꺾쇠 (전날 / 이전 달) */
export function ChevronLeftIcon({
  className = "h-4 w-4 shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12.5 15 7.5 10 12.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 우측 꺾쇠 (다음날 / 다음 달) */
export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0", className)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 5 12.5 10 7.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 닫기 X */
export function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5 15 15M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 세로 점 3개 — 더보기(케밥) 메뉴 */
export function MoreVerticalIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}

/** 가로 열 보기 — 월별 day column */
export function MonthColumnsViewIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="3.5"
        height="12"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect
        x="8.25"
        y="4"
        width="3.5"
        height="12"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect
        x="13.5"
        y="4"
        width="3.5"
        height="12"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/** 세로 타임라인 보기 */
export function MonthTimelineViewIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5h12M4 10h12M4 15h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="4" cy="5" r="1.25" fill="currentColor" />
      <circle cx="4" cy="10" r="1.25" fill="currentColor" />
      <circle cx="4" cy="15" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** 세로 6점 — 드래그 핸들 */
export function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
      <circle cx="8" cy="14" r="1.5" />
    </svg>
  );
}

/** 밝은 테마 */
export function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 3.25v1.5M10 15.25v1.5M3.25 10h1.5M15.25 10h1.5M5.4 5.4l1.06 1.06M13.54 13.54l1.06 1.06M5.4 14.6l1.06-1.06M13.54 6.46l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 어두운 테마 */
export function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.5 4.25A5.75 5.75 0 1 0 15.75 12 4.75 4.75 0 0 1 11.5 4.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 시스템 테마 */
export function MonitorIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.25"
        y="4.25"
        width="13.5"
        height="9.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 16.5h6M10 13.75V16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
