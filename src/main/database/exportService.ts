import { dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type { TodoItem } from '@shared/types/todo'
import { getAllTodos, replaceStore } from './todoRepository'
import { readStore, writeStore } from './storage'

/** IPC 익스포트/임포트 결과 */
export interface ExportImportResult {
  success: boolean
  cancelled?: boolean
  filePath?: string
  error?: string
}

/**
 * TodoItem 1건을 SQL INSERT 문 문자열로 변환한다.
 */
function todoToInsertSql(item: TodoItem): string {
  const values = [
    item.id,
    `'${item.content.replace(/'/g, "''")}'`,
    `'${item.target_date}'`,
    `'${item.status}'`,
    item.created_at,
    item.sort_order,
    item.batch_id ? `'${item.batch_id}'` : 'NULL'
  ]

  return `INSERT INTO todos (id, content, target_date, status, created_at, sort_order, batch_id) VALUES (${values.join(', ')});`
}

/**
 * SQL 익스포트용 CREATE TABLE + INSERT 스크립트 본문을 생성한다.
 */
function buildSqlScript(todos: TodoItem[]): string {
  const header = `-- my-todo-app backup
-- generated at ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  target_date TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  batch_id TEXT
);

`

  const inserts = todos.map(todoToInsertSql).join('\n')
  return header + inserts + '\n'
}

/**
 * JSON 파일로 전체 데이터를 익스포트한다.
 * 저장 대화상자에서 경로를 선택한다.
 */
export async function exportToJson(): Promise<ExportImportResult> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'JSON 백업 저장',
      defaultPath: `todos-backup-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }

    const store = readStore()
    writeFileSync(result.filePath, JSON.stringify(store, null, 2), 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON 익스포트 실패'
    }
  }
}

/**
 * SQL INSERT 스크립트로 전체 데이터를 익스포트한다.
 */
export async function exportToSql(): Promise<ExportImportResult> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'SQL 백업 저장',
      defaultPath: `todos-backup-${Date.now()}.sql`,
      filters: [{ name: 'SQL', extensions: ['sql'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }

    const sql = buildSqlScript(getAllTodos())
    writeFileSync(result.filePath, sql, 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SQL 익스포트 실패'
    }
  }
}

/**
 * JSON 파일에서 데이터를 임포트하여 저장소를 전체 교체한다.
 */
export async function importFromJson(): Promise<ExportImportResult> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'JSON 백업 불러오기',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const filePath = result.filePaths[0]
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as { todos?: TodoItem[] }

    if (!parsed.todos || !Array.isArray(parsed.todos)) {
      return { success: false, error: '유효하지 않은 JSON 형식입니다.' }
    }

    replaceStore(parsed.todos)

    return { success: true, filePath }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON 임포트 실패'
    }
  }
}

/**
 * 디스크 저장소를 초기화한다 (개발·디버그용 — UI에서는 미사용).
 */
export function resetStore(): void {
  writeStore({ todos: [] })
}
