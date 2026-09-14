import { useEffect, useState, type ReactNode } from "react";
import { useThemeStore } from "@renderer/stores/useThemeStore";
import { cn } from "@renderer/utils/cn";
import tauriMark from "@renderer/assets/credits/tauri.svg";
import reactLight from "@renderer/assets/credits/react-light.svg";
import reactDark from "@renderer/assets/credits/react-dark.svg";
import viteMark from "@renderer/assets/credits/vite.svg";
import tailwindMark from "@renderer/assets/credits/tailwindcss.svg";
import typescriptMark from "@renderer/assets/credits/typescript.svg";
import radixMark from "@renderer/assets/credits/radixui.svg";
import dndkitMark from "@renderer/assets/credits/dndkit.svg";

const markClass = "h-5 w-5 shrink-0 object-contain";

function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    if (mode === "dark") {
      setIsDark(true);
      return;
    }
    if (mode === "light") {
      setIsDark(false);
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setIsDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [mode]);

  return isDark;
}

function Mark({
  src,
  invertInDark,
  className,
}: {
  src: string;
  invertInDark?: boolean;
  className?: string;
}) {
  const isDark = useIsDark();
  return (
    <img
      src={src}
      alt=""
      className={cn(markClass, invertInDark && isDark && "invert", className)}
    />
  );
}

function ReactMark({ className }: { className?: string }) {
  const isDark = useIsDark();
  return <Mark src={isDark ? reactDark : reactLight} className={className} />;
}

function ZustandMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn(markClass, className)}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle cx="10" cy="11" r="6.2" fill="#C4A574" />
      <circle cx="5.2" cy="6.2" r="2.4" fill="#C4A574" />
      <circle cx="14.8" cy="6.2" r="2.4" fill="#C4A574" />
      <circle cx="5.2" cy="6.2" r="1.15" fill="#8B6914" />
      <circle cx="14.8" cy="6.2" r="1.15" fill="#8B6914" />
      <ellipse cx="10" cy="12.4" rx="2" ry="1.35" fill="#6B4F32" />
      <circle cx="7.6" cy="10.2" r="0.7" fill="#3F2A14" />
      <circle cx="12.4" cy="10.2" r="0.7" fill="#3F2A14" />
    </svg>
  );
}

export type OpenSourceLib = {
  name: string;
  url: string;
  icon: ({ className }: { className?: string }) => ReactNode;
};

/** 앱이 직접 쓰는 오픈소스 — 마크는 가능하면 공식 SVG */
export const OPEN_SOURCE_LIBS: OpenSourceLib[] = [
  {
    name: "Tauri",
    url: "https://tauri.app",
    icon: ({ className }: { className?: string }) => (
      <Mark src={tauriMark} className={className} />
    ),
  },
  {
    name: "React",
    url: "https://react.dev",
    icon: ({ className }: { className?: string }) => (
      <ReactMark className={className} />
    ),
  },
  {
    name: "Vite",
    url: "https://vite.dev",
    icon: ({ className }: { className?: string }) => (
      <Mark src={viteMark} className={className} />
    ),
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com",
    icon: ({ className }: { className?: string }) => (
      <Mark src={tailwindMark} className={className} />
    ),
  },
  {
    name: "Zustand",
    url: "https://github.com/pmndrs/zustand",
    icon: ({ className }: { className?: string }) => (
      <ZustandMark className={className} />
    ),
  },
  {
    name: "dnd-kit",
    url: "https://dndkit.com",
    icon: ({ className }: { className?: string }) => (
      <Mark src={dndkitMark} className={className} />
    ),
  },
  {
    name: "Radix UI",
    url: "https://www.radix-ui.com",
    icon: ({ className }: { className?: string }) => (
      <Mark src={radixMark} invertInDark className={className} />
    ),
  },
  {
    name: "TypeScript",
    url: "https://www.typescriptlang.org",
    icon: ({ className }: { className?: string }) => (
      <Mark src={typescriptMark} className={className} />
    ),
  },
];
