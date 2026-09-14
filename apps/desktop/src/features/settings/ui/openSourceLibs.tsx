import type { ReactNode } from "react";

const iconClass = "h-5 w-5 shrink-0 text-fg-secondary";

function Mark({ children }: { children: ReactNode }) {
  return (
    <svg className={iconClass} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function TauriMark() {
  return (
    <Mark>
      <circle cx="8" cy="10" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="4.25" stroke="currentColor" strokeWidth="1.5" />
    </Mark>
  );
}

function ReactMark() {
  return (
    <Mark>
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      <ellipse cx="10" cy="10" rx="7.25" ry="2.8" stroke="currentColor" strokeWidth="1.25" />
      <ellipse
        cx="10"
        cy="10"
        rx="7.25"
        ry="2.8"
        stroke="currentColor"
        strokeWidth="1.25"
        transform="rotate(60 10 10)"
      />
      <ellipse
        cx="10"
        cy="10"
        rx="7.25"
        ry="2.8"
        stroke="currentColor"
        strokeWidth="1.25"
        transform="rotate(120 10 10)"
      />
    </Mark>
  );
}

function ViteMark() {
  return (
    <Mark>
      <path
        d="M10 3.5 16.5 16H3.5L10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10 8v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Mark>
  );
}

function TailwindMark() {
  return (
    <Mark>
      <path
        d="M3.5 10.2c1-2.6 2.3-4 4.8-4 3.6 0 3.6 5.2 7.3 5.2 2.3 0 3.6-1.4 4.7-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M3.5 14c1-2.6 2.3-4 4.8-4 3.6 0 3.6 5.2 7.3 5.2 2.3 0 3.6-1.4 4.7-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Mark>
  );
}

function ZustandMark() {
  return (
    <Mark>
      <rect x="4.25" y="4.25" width="11.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Mark>
  );
}

function DndKitMark() {
  return (
    <Mark>
      <circle cx="6" cy="6" r="1.25" fill="currentColor" />
      <circle cx="14" cy="6" r="1.25" fill="currentColor" />
      <circle cx="6" cy="10" r="1.25" fill="currentColor" />
      <circle cx="14" cy="10" r="1.25" fill="currentColor" />
      <circle cx="6" cy="14" r="1.25" fill="currentColor" />
      <circle cx="14" cy="14" r="1.25" fill="currentColor" />
    </Mark>
  );
}

function RadixMark() {
  return (
    <Mark>
      <circle cx="7" cy="10" r="3.1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.2 6.9 16 10l-4.8 3.1V6.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </Mark>
  );
}

function TypeScriptMark() {
  return (
    <Mark>
      <rect x="3.25" y="3.25" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 9.2h6M10 9.2V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Mark>
  );
}

export type OpenSourceLib = {
  name: string;
  url: string;
  icon: () => ReactNode;
};

/** 앱이 직접 쓰는 오픈소스 */
export const OPEN_SOURCE_LIBS: OpenSourceLib[] = [
  { name: "Tauri", url: "https://tauri.app", icon: TauriMark },
  { name: "React", url: "https://react.dev", icon: ReactMark },
  { name: "Vite", url: "https://vite.dev", icon: ViteMark },
  { name: "Tailwind CSS", url: "https://tailwindcss.com", icon: TailwindMark },
  { name: "Zustand", url: "https://github.com/pmndrs/zustand", icon: ZustandMark },
  { name: "dnd-kit", url: "https://dndkit.com", icon: DndKitMark },
  { name: "Radix UI", url: "https://www.radix-ui.com", icon: RadixMark },
  { name: "TypeScript", url: "https://www.typescriptlang.org", icon: TypeScriptMark },
];
