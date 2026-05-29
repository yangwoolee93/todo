import { useUIStore } from '@renderer/stores/useUIStore'
import { useTodoStore } from '@renderer/features/todo/model/useTodoStore'
import { useMonthStore } from '@renderer/features/month/model/useMonthStore'

/**
 * 데이터 백업·복원 패널 (F-04)
 */
export function BackupPanel() {
  const activeDate = useUIStore((s) => s.activeDate)
  const yearMonth = useMonthStore((s) => s.yearMonth)
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate)
  const loadMonthSummary = useMonthStore((s) => s.loadMonthSummary)

  /** 임포트 후 오늘·월별 데이터 재조회 */
  const refresh = async () => {
    await Promise.all([
      loadTodosByDate(activeDate),
      loadMonthSummary(yearMonth),
    ])
  }

  const handleExportJson = async () => {
    const result = await window.api.exportJson()
    if (result.success && result.data?.filePath) {
      alert(`JSON 백업 완료:\n${result.data.filePath}`)
    } else if (!result.success && result.error) {
      alert(result.error)
    }
  }

  const handleExportSql = async () => {
    const result = await window.api.exportSql()
    if (result.success && result.data?.filePath) {
      alert(`SQL 백업 완료:\n${result.data.filePath}`)
    } else if (!result.success && result.error) {
      alert(result.error)
    }
  }

  const handleImportJson = async () => {
    const confirmed = confirm('현재 데이터를 선택한 JSON으로 교체합니다. 계속할까요?')
    if (!confirmed) return

    const result = await window.api.importJson()
    if (result.success && result.data?.filePath) {
      alert(`JSON 불러오기 완료:\n${result.data.filePath}`)
      await refresh()
    } else if (!result.success && result.error) {
      alert(result.error)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={() => void handleExportJson()}>
        JSON 내보내기
      </button>
      <button type="button" className="btn" onClick={() => void handleExportSql()}>
        SQL 내보내기
      </button>
      <button type="button" className="btn" onClick={() => void handleImportJson()}>
        JSON 불러오기
      </button>
    </div>
  )
}
