import type {
  CreateBatchResult,
  CreateTodoMonthPayload,
  CreateTodoPayload,
  CreateTodoRangePayload,
  DaySummary,
  DeleteTodoScope,
  DisplayTodo,
  TodoItem,
  TodoStore
} from '@shared/types/todo'
import {
  enumerateDateRange,
  getMonthDateRange,
  isValidDateString
} from '@shared/utils/dateRange'
import { mutateStore, readStore } from './storage'

/** 새 batch_id 생성 */
function newBatchId(): string {
  return `batch-${Date.now()}`
}

/**
 * 구 JSON 항목을 새 스키마로 변환한다. 변환 불가 항목은 null.
 */
function normalizeItem(raw: Record<string, unknown>): TodoItem | null {
  if (raw.is_deleted === true) {
    return null
  }

  const id = typeof raw.id === 'number' ? raw.id : null
  const content = typeof raw.content === 'string' ? raw.content : null
  if (id === null || !content) {
    return null
  }

  let targetDate = typeof raw.target_date === 'string' ? raw.target_date : ''

  if (raw.is_global === true && !targetDate) {
    return null
  }

  if (!targetDate || !isValidDateString(targetDate)) {
    return null
  }

  return {
    id,
    content,
    target_date: targetDate,
    is_completed: raw.is_completed === true,
    created_at: typeof raw.created_at === 'number' ? raw.created_at : id,
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 0,
    batch_id: typeof raw.batch_id === 'string' ? raw.batch_id : null
  }
}

/** 저장소 todos 배열 정규화 */
function normalizeStoreTodos(todos: unknown[]): TodoItem[] {
  return todos
    .map((item) => normalizeItem(item as Record<string, unknown>))
    .filter((item): item is TodoItem => item !== null)
}

/** TodoItem → DisplayTodo */
function toDisplay(item: TodoItem): DisplayTodo {
  return {
    id: item.id,
    content: item.content,
    is_completed: item.is_completed,
    sort_order: item.sort_order,
    created_at: item.created_at,
    batch_id: item.batch_id
  }
}

/** sort_order → created_at 순 정렬 */
function sortByOrder(items: DisplayTodo[]): DisplayTodo[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order
    }
    return a.created_at - b.created_at
  })
}

/** sort_order 맨 뒤 값 */
function nextSortOrder(store: TodoStore): number {
  if (store.todos.length === 0) return 0
  return Math.max(...store.todos.map((t) => t.sort_order)) + 1
}

/** 1줄 입력 검증 */
function sanitizeContent(content: string): string | null {
  const trimmed = content.replace(/[\r\n]+/g, ' ').trim()
  return trimmed.length > 0 ? trimmed : null
}

/** ID로 투두 찾기 */
function findById(store: TodoStore, id: number): TodoItem | undefined {
  return store.todos.find((t) => t.id === id)
}

/**
 * 특정 날짜의 투두 목록 조회
 */
export function getTodosByDate(targetDate: string): DisplayTodo[] {
  const store = readStore()
  const items = store.todos
    .filter((item) => item.target_date === targetDate)
    .map(toDisplay)
  return sortByOrder(items)
}

/**
 * 특정 월 일별 요약 조회
 */
export function getMonthSummary(yearMonth: string): DaySummary[] {
  const { start, end } = getMonthDateRange(yearMonth)
  const dates = enumerateDateRange(start, end)

  return dates.map((date) => ({
    date,
    day: Number(date.split('-')[2]),
    todos: getTodosByDate(date)
  }))
}

/**
 * 하루 1건 투두 생성 (batch_id 없음)
 */
export function createTodo(payload: CreateTodoPayload): TodoItem | null {
  const content = sanitizeContent(payload.content)
  if (!content || !isValidDateString(payload.target_date)) {
    return null
  }

  const now = Date.now()
  const newItem: TodoItem = {
    id: now,
    content,
    target_date: payload.target_date,
    is_completed: false,
    created_at: now,
    sort_order: 0,
    batch_id: null
  }

  mutateStore((store) => {
    newItem.sort_order = nextSortOrder(store)
    store.todos.push(newItem)
  })

  return newItem
}

/**
 * 기간 일괄 투두 생성 — batch_id로 묶음
 */
export function createTodosInRange(payload: CreateTodoRangePayload): CreateBatchResult | null {
  const content = sanitizeContent(payload.content)
  if (!content) return null

  if (!isValidDateString(payload.start_date) || !isValidDateString(payload.end_date)) {
    throw new Error('날짜 형식이 올바르지 않습니다.')
  }

  if (payload.start_date > payload.end_date) {
    throw new Error('시작일은 종료일보다 늦을 수 없습니다.')
  }

  const dates = enumerateDateRange(payload.start_date, payload.end_date)
  const batchId = newBatchId()

  mutateStore((store) => {
    const baseOrder = nextSortOrder(store)
    dates.forEach((date, index) => {
      const now = Date.now() + index
      store.todos.push({
        id: now,
        content,
        target_date: date,
        is_completed: false,
        created_at: now,
        sort_order: baseOrder + index,
        batch_id: batchId
      })
    })
  })

  return { count: dates.length, batch_id: batchId }
}

/**
 * 한 달 일괄 투두 생성 — 해당 월 1일~말일
 */
export function createTodosForMonth(payload: CreateTodoMonthPayload): CreateBatchResult | null {
  const { start, end } = getMonthDateRange(payload.year_month)
  return createTodosInRange({
    content: payload.content,
    start_date: start,
    end_date: end
  })
}

/**
 * 완료 상태 토글 — 해당 레코드만
 */
export function toggleComplete(todoId: number): boolean {
  let changed = false

  mutateStore((store) => {
    const item = findById(store, todoId)
    if (!item) return
    item.is_completed = !item.is_completed
    changed = true
  })

  return changed
}

/**
 * 투두 하드 삭제
 * - day: 해당 id 1건만
 * - batch: 같은 batch_id 전체
 */
export function deleteTodo(todoId: number, scope: DeleteTodoScope): boolean {
  let changed = false

  mutateStore((store) => {
    const item = findById(store, todoId)
    if (!item) return

    if (scope === 'batch' && item.batch_id) {
      const before = store.todos.length
      store.todos = store.todos.filter((t) => t.batch_id !== item.batch_id)
      changed = store.todos.length < before
      return
    }

    const before = store.todos.length
    store.todos = store.todos.filter((t) => t.id !== todoId)
    changed = store.todos.length < before
  })

  return changed
}

/**
 * 내용 수정 — batch_id 있으면 묶음 전체, 없으면 1건
 */
export function updateTodoContent(todoId: number, contentRaw: string): boolean {
  const content = sanitizeContent(contentRaw)
  if (!content) return false

  let changed = false

  mutateStore((store) => {
    const item = findById(store, todoId)
    if (!item) return

    if (item.batch_id) {
      store.todos.forEach((t) => {
        if (t.batch_id === item.batch_id) {
          t.content = content
        }
      })
      changed = true
      return
    }

    item.content = content
    changed = true
  })

  return changed
}

/**
 * 순서 변경 (화살표)
 */
export function reorderTodo(
  targetDate: string,
  todoId: number,
  direction: 'up' | 'down'
): boolean {
  const displayList = getTodosByDate(targetDate)
  const index = displayList.findIndex((t) => t.id === todoId)
  if (index === -1) return false

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= displayList.length) return false

  const current = displayList[index]
  const neighbor = displayList[swapIndex]

  mutateStore((store) => {
    const currentItem = findById(store, current.id)
    const neighborItem = findById(store, neighbor.id)
    if (!currentItem || !neighborItem) return

    const temp = currentItem.sort_order
    currentItem.sort_order = neighborItem.sort_order
    neighborItem.sort_order = temp
  })

  return true
}

/** 전체 투두 (익스포트용) */
export function getAllTodos(): TodoItem[] {
  return readStore().todos
}

/** 저장소 교체 (임포트) */
export function replaceStore(todos: TodoItem[]): void {
  mutateStore((store) => {
    store.todos = normalizeStoreTodos(todos as unknown[])
  })
}

/** readStore 후 정규화 — storage.ts에서 호출하거나 첫 조회 시 */
export function ensureNormalizedStore(): void {
  mutateStore((store) => {
    store.todos = normalizeStoreTodos(store.todos as unknown[])
  })
}
