interface BackupPanelProps {
  /** 데이터 새로고침 (임포트 후 호출) */
  onRefresh: () => Promise<void>
}

/**
 * 데이터 백업·복원 패널 (F-04)
 */
export function BackupPanel({ onRefresh }: BackupPanelProps) {
  /** JSON 파일로 익스포트 */
  const handleExportJson = async () => {
    const result = await window.api.exportJson()
    if (result.success && result.data?.filePath) {
      alert(`JSON 백업 완료:\n${result.data.filePath}`)
    } else if (!result.success && result.error) {
      alert(result.error)
    }
  }

  /** SQL INSERT 스크립트로 익스포트 */
  const handleExportSql = async () => {
    const result = await window.api.exportSql()
    if (result.success && result.data?.filePath) {
      alert(`SQL 백업 완료:\n${result.data.filePath}`)
    } else if (!result.success && result.error) {
      alert(result.error)
    }
  }

  /** JSON 파일 임포트 (전체 교체) */
  const handleImportJson = async () => {
    const confirmed = confirm('현재 데이터를 선택한 JSON으로 교체합니다. 계속할까요?')
    if (!confirmed) return

    const result = await window.api.importJson()
    if (result.success && result.data?.filePath) {
      alert(`JSON 불러오기 완료:\n${result.data.filePath}`)
      await onRefresh()
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
