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

/** Google 공식 4색 G. 색을 바꾸지 않는다. */
export function GoogleGIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
