import { ThemeSelector } from './ThemeSelector'
import { BackupPanel } from './BackupPanel'

/**
 * 설정 뷰 — 테마 + 데이터 백업
 */
export function SettingsView() {
  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <h2 className="mb-1 text-base font-semibold text-fg">테마</h2>
        <p className="mb-4 text-xs text-fg-secondary">밝은 모드, 어두운 모드, 시스템 자동 중 선택</p>
        <ThemeSelector />
      </section>

      <section className="card">
        <h2 className="mb-1 text-base font-semibold text-fg">데이터 백업</h2>
        <p className="mb-4 text-xs text-fg-secondary">JSON/SQL 내보내기 및 JSON 불러오기</p>
        <BackupPanel />
      </section>
    </div>
  )
}
