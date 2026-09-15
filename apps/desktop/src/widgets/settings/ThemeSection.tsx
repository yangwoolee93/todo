import { cn } from "@renderer/utils/cn";
import { useThemeStore } from "@renderer/stores/useThemeStore";
import { THEME_OPTIONS } from "./themeOptions";

export default function ThemeSection() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const selectedIndex = THEME_OPTIONS.findIndex(
    (option) => option.value === mode,
  );
  const current = THEME_OPTIONS[selectedIndex] ?? THEME_OPTIONS[2];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex items-center justify-between",
          "rounded-(--radius-btn) bg-surface p-4 gap-4",
        )}
      >
        <div className="flex flex-1 flex-col items-start gap-4">
          <p className="text-md font-bold text-fg">{current.label}</p>
          <p className="mt-1 text-xs text-fg-secondary">{current.desc}</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="relative flex rounded-full bg-muted p-1">
            {THEME_OPTIONS.map((option, i) => (
              <button
                key={"shadow-" + option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                aria-label={option.label}
                className={cn(
                  "relative size-8 rounded-full",
                  "bg-surface/70 mx-8",
                  i === 0 && "ml-0",
                  i === 2 && "mr-0",
                )}
                onClick={() => setMode(option.value)}
              />
            ))}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1 ",
                "size-8 rounded-full",
                "bg-accent shadow-sm transition-transform duration-200",
              )}
              style={{ transform: `translateX(${selectedIndex * 96}px)` }}
            />
          </div>
          <div className={cn("flex gap-16")}>
            {THEME_OPTIONS.map((option) => (
              <span
                key={option.value}
                className={cn(
                  "flex size-8 items-center justify-center text-fg-secondary",
                  mode === option.value && "text-fg",
                )}
              >
                <option.icon />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
