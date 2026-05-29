import { useTheme } from '@renderer/hooks/useTheme'
import type { ThemeMode } from '@renderer/hooks/useTheme'

const OPTIONS: { value: ThemeMode; label: string; desc: string }[] = [
  { value: 'light', label: '밝은 모드', desc: '항상 밝은 배경' },
  { value: 'dark', label: '어두운 모드', desc: '항상 어두운 배경' },
  { value: 'auto', label: '자동', desc: 'Windows 테마 설정 따름' },
]

/**
 * 밝은/어두운/자동 테마 선택 UI
 */
export function ThemeSelector() {
  const { mode, setMode } = useTheme()

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-start gap-3 rounded-(--radius-btn) border px-3 py-2.5 transition-colors ${
            mode === option.value
              ? 'border-accent bg-accent-soft'
              : 'border-border bg-surface hover:bg-muted'
          }`}
        >
          <input
            type="radio"
            name="theme-mode"
            className="mt-0.5 accent-accent"
            checked={mode === option.value}
            onChange={() => setMode(option.value)}
          />
          <span>
            <span className="block text-sm font-medium text-fg">{option.label}</span>
            <span className="block text-xs text-fg-secondary">{option.desc}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
