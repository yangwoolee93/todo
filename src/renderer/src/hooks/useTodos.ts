import { useCallback, useEffect, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type {
  CreateTodoMonthPayload,
  CreateTodoRangePayload,
  DaySummary,
  DeleteTodoScope,
  DisplayTodo,
  TodoItem,
  TodoStatus
} from '@shared/types/todo'

interface UseTodosOptions {
  /** 오늘 탭에서 보는 날짜 */
  activeDate: string
  /** 월별 요약 조회 월 (YYYY-MM) */
  summaryMonth?: string
}

interface UseTodosReturn {
  todos: DisplayTodo[]
  monthSummary: DaySummary[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createTodo: (content: string, targetDate: string) => Promise<boolean>
  createTodoRange: (payload: CreateTodoRangePayload) => Promise<boolean>
  createTodoMonth: (payload: CreateTodoMonthPayload) => Promise<boolean>
  toggleCompletion: (todoId: number) => Promise<boolean>
  setTodoStatus: (todoId: number, status: TodoStatus) => Promise<boolean>
  deleteTodo: (todoId: number, scope: DeleteTodoScope) => Promise<boolean>
  updateTodoContent: (todoId: number, content: string) => Promise<boolean>
  moveTodo: (activeId: number, overId: number) => Promise<boolean>
}

/** pending ↔ completed 토글. failed는 null */
function flipCompletionStatus(status: TodoStatus): TodoStatus | null {
  if (status === 'pending') return 'completed'
  if (status === 'completed') return 'pending'
  return null
}

/** sort_order → created_at 순 정렬 */
function sortTodos(items: DisplayTodo[]): DisplayTodo[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at - b.created_at
  })
}

/** IPC TodoItem → 화면용 DisplayTodo */
function toDisplay(item: TodoItem): DisplayTodo {
  return {
    id: item.id,
    content: item.content,
    status: item.status,
    sort_order: item.sort_order,
    created_at: item.created_at,
    batch_id: item.batch_id
  }
}

/** 월별 요약에서 특정 일·id 항목 필드 패치 */
function patchTodoInSummary(
  summary: DaySummary[],
  date: string,
  todoId: number,
  patch: Partial<DisplayTodo>
): DaySummary[] {
  return summary.map((column) => {
    if (column.date !== date) return column
    return {
      ...column,
      todos: column.todos.map((todo) => (todo.id === todoId ? { ...todo, ...patch } : todo))
    }
  })
}

/** 월별 요약에서 특정 일 컬럼 전체 교체 */
function replaceDayInSummary(summary: DaySummary[], date: string, todos: DisplayTodo[]): DaySummary[] {
  return summary.map((column) => (column.date === date ? { ...column, todos } : column))
}

/** 월별 요약에서 특정 일·id 항목 제거 */
function removeTodoFromSummary(summary: DaySummary[], date: string, todoId: number): DaySummary[] {
  return summary.map((column) => {
    if (column.date !== date) return column
    return { ...column, todos: column.todos.filter((todo) => todo.id !== todoId) }
  })
}

/**
 * 오늘 탭 데이터 훅
 * - IPC 조회·변경 래핑
 * - 체크/순서: 낙관적 갱신 + todoId 잠금
 * - 추가/묶음 변경: syncDaily / syncMonth (loading UI 없음)
 */
export function useTodos({ activeDate, summaryMonth }: UseTodosOptions): UseTodosReturn {
  /** activeDate 기준 일별 목록 */
  const [todos, setTodos] = useState<DisplayTodo[]>([])
  /** 월별 보드용 (오늘 탭에서도 탭 전환 대비 동기화) */
  const [monthSummary, setMonthSummary] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const yearMonth = summaryMonth ?? activeDate.slice(0, 7)

  /** 날짜/월 변경 load race guard — 늦은 응답 무시 */
  const loadIdRef = useRef(0)
  /** 동일 todoId 연타·중복 IPC 방지 */
  const pendingTodoIdsRef = useRef(new Set<number>())
  /** callback 클로저 stale 방지 */
  const todosRef = useRef(todos)
  const monthSummaryRef = useRef(monthSummary)
  const activeDateRef = useRef(activeDate)

  todosRef.current = todos
  monthSummaryRef.current = monthSummary
  activeDateRef.current = activeDate

  const isPending = (todoId: number) => pendingTodoIdsRef.current.has(todoId)

  /** todoId 단위 in-flight 잠금 */
  const withTodoLock = async (todoId: number, action: () => Promise<boolean>): Promise<boolean> => {
    if (isPending(todoId)) return false
    pendingTodoIdsRef.current.add(todoId)
    try {
      return await action()
    } finally {
      pendingTodoIdsRef.current.delete(todoId)
    }
  }

  const fetchDaily = useCallback(async (date: string): Promise<DisplayTodo[] | null> => {
    const result = await window.api.getTodosByDate(date)
    if (!result.success) throw new Error(result.error ?? '일별 조회 실패')
    return result.data ?? []
  }, [])

  const fetchMonth = useCallback(async (month: string): Promise<DaySummary[] | null> => {
    const result = await window.api.getMonthSummary(month)
    if (!result.success) throw new Error(result.error ?? '월별 조회 실패')
    return result.data ?? []
  }, [])

  /** activeDate·yearMonth 변경 시 — 목록 비우지 않음, loadId로 race 방지 */
  useEffect(() => {
    const loadId = ++loadIdRef.current
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [daily, month] = await Promise.all([
          fetchDaily(activeDate),
          fetchMonth(yearMonth)
        ])

        if (loadId !== loadIdRef.current) return

        setTodos(daily ?? [])
        setMonthSummary(month ?? [])
      } catch (err) {
        if (loadId !== loadIdRef.current) return
        setError(err instanceof Error ? err.message : '데이터 로드 실패')
      } finally {
        if (loadId === loadIdRef.current) setLoading(false)
      }
    })()
  }, [activeDate, yearMonth, fetchDaily, fetchMonth])

  /** activeDate 일별 목록만 재조회 (loading 없음) */
  const syncDaily = useCallback(async () => {
    const daily = await fetchDaily(activeDateRef.current)
    if (daily) setTodos(daily)
  }, [fetchDaily])

  /** yearMonth 월별 요약만 재조회 */
  const syncMonth = useCallback(async () => {
    const month = await fetchMonth(yearMonth)
    if (month) setMonthSummary(month)
  }, [fetchMonth, yearMonth])

  /** 설정 JSON import 등 — 전체 재동기화 */
  const syncAll = useCallback(async () => {
    setError(null)
    try {
      const [daily, month] = await Promise.all([
        fetchDaily(activeDateRef.current),
        fetchMonth(yearMonth)
      ])
      if (daily) setTodos(daily)
      if (month) setMonthSummary(month)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 동기화 실패')
    }
  }, [fetchDaily, fetchMonth, yearMonth])

  const refresh = syncAll

  /** 하루 1건 추가 — activeDate면 목록 merge, 아니면 월 요약만 갱신 */
  const createTodo = useCallback(
    async (content: string, targetDate: string): Promise<boolean> => {
      const result = await window.api.createTodo({ content, target_date: targetDate })
      if (!result.success || !result.data) {
        setError(result.error ?? '생성 실패')
        return false
      }

      const item = result.data
      const created = toDisplay(item)
      if (item.target_date === activeDateRef.current) {
        setTodos((prev) => {
          const next = sortTodos([...prev, created])
          setMonthSummary((summary) => replaceDayInSummary(summary, item.target_date, next))
          return next
        })
      } else {
        await syncMonth()
      }

      return true
    },
    [syncMonth]
  )

  /** 기간 일괄 추가 — 구조 변경이라 daily+month 재조회 */
  const createTodoRange = useCallback(
    async (payload: CreateTodoRangePayload): Promise<boolean> => {
      const result = await window.api.createTodoRange(payload)
      if (!result.success) {
        setError(result.error ?? '기간 일괄 생성 실패')
        return false
      }
      await syncDaily()
      await syncMonth()
      return true
    },
    [syncDaily, syncMonth]
  )

  /** 한 달 일괄 추가 */
  const createTodoMonth = useCallback(
    async (payload: CreateTodoMonthPayload): Promise<boolean> => {
      const result = await window.api.createTodoMonth(payload)
      if (!result.success) {
        setError(result.error ?? '한 달 일괄 생성 실패')
        return false
      }
      await syncDaily()
      await syncMonth()
      return true
    },
    [syncDaily, syncMonth]
  )

  /** 아이콘·텍스트 클릭 — pending↔completed, failed는 변경 없음 */
  const toggleCompletion = useCallback(
    (todoId: number): Promise<boolean> =>
      withTodoLock(todoId, async () => {
        const target = todosRef.current.find((todo) => todo.id === todoId)
        const nextStatus = target ? flipCompletionStatus(target.status) : null
        if (!target || !nextStatus) return false

        const date = activeDateRef.current
        const previousTodos = todosRef.current
        const previousSummary = monthSummaryRef.current

        setTodos((prev) =>
          prev.map((todo) => (todo.id === todoId ? { ...todo, status: nextStatus } : todo))
        )
        setMonthSummary((prev) => patchTodoInSummary(prev, date, todoId, { status: nextStatus }))

        const result = await window.api.toggleCompletion(todoId)
        if (!result.success) {
          setTodos(previousTodos)
          setMonthSummary(previousSummary)
          setError(result.error ?? '상태 변경 실패')
          return false
        }

        return true
      }),
    []
  )

  /** ⋮ 실패/재시도 — failed↔pending 등 명시적 status */
  const setTodoStatus = useCallback(
    (todoId: number, status: TodoStatus): Promise<boolean> =>
      withTodoLock(todoId, async () => {
        const target = todosRef.current.find((todo) => todo.id === todoId)
        if (!target || target.status === status) return false

        const date = activeDateRef.current
        const previousTodos = todosRef.current
        const previousSummary = monthSummaryRef.current

        setTodos((prev) =>
          prev.map((todo) => (todo.id === todoId ? { ...todo, status } : todo))
        )
        setMonthSummary((prev) => patchTodoInSummary(prev, date, todoId, { status }))

        const result = await window.api.setTodoStatus({ id: todoId, status })
        if (!result.success) {
          setTodos(previousTodos)
          setMonthSummary(previousSummary)
          setError(result.error ?? '상태 변경 실패')
          return false
        }

        return true
      }),
    []
  )

  /** scope=day: 낙관적 제거 / scope=batch: 묶음 전체 삭제 후 재조회 */
  const deleteTodo = useCallback(
    async (todoId: number, scope: DeleteTodoScope): Promise<boolean> => {
      if (scope === 'batch') {
        const result = await window.api.deleteTodo({ id: todoId, scope })
        if (!result.success) {
          setError(result.error ?? '삭제 실패')
          return false
        }
        await syncDaily()
        await syncMonth()
        return true
      }

      return withTodoLock(todoId, async () => {
        const date = activeDateRef.current
        const previousTodos = todosRef.current
        const previousSummary = monthSummaryRef.current
        const nextTodos = previousTodos.filter((todo) => todo.id !== todoId)

        setTodos(nextTodos)
        setMonthSummary((prev) => removeTodoFromSummary(prev, date, todoId))

        const result = await window.api.deleteTodo({ id: todoId, scope: 'day' })
        if (!result.success) {
          setTodos(previousTodos)
          setMonthSummary(previousSummary)
          setError(result.error ?? '삭제 실패')
          return false
        }

        return true
      })
    },
    [syncDaily, syncMonth]
  )

  /** 단건: 로컬 content 패치 / batch_id: 묶음 전체 수정 후 재조회 */
  const updateTodoContent = useCallback(
    async (todoId: number, content: string): Promise<boolean> => {
      const target = todosRef.current.find((todo) => todo.id === todoId)
      if (!target) return false

      const result = await window.api.updateTodoContent({ id: todoId, content })
      if (!result.success) {
        setError(result.error ?? '수정 실패')
        return false
      }

      if (target.batch_id) {
        await syncDaily()
        await syncMonth()
      } else {
        setTodos((prev) =>
          prev.map((todo) => (todo.id === todoId ? { ...todo, content } : todo))
        )
        setMonthSummary((prev) =>
          patchTodoInSummary(prev, activeDateRef.current, todoId, { content })
        )
      }

      return true
    },
    [syncDaily, syncMonth]
  )

  /** 드래그앤드롭 순서 — UI·월 요약 먼저 바꾸고 IPC, 실패 시 롤백 */
  const moveTodo = useCallback(
    (activeId: number, overId: number): Promise<boolean> =>
      withTodoLock(activeId, async () => {
        const current = todosRef.current
        const fromIndex = current.findIndex((todo) => todo.id === activeId)
        const toIndex = current.findIndex((todo) => todo.id === overId)
        if (fromIndex === -1 || toIndex === -1) return false
        if (fromIndex === toIndex) return true

        const previousTodos = current
        const previousSummary = monthSummaryRef.current
        const sortOrders = current.map((t) => t.sort_order).sort((a, b) => a - b)
        const next = arrayMove(current, fromIndex, toIndex).map((item, index) => ({
          ...item,
          sort_order: sortOrders[index],
        }))

        setTodos(next)
        setMonthSummary((prev) => replaceDayInSummary(prev, activeDateRef.current, next))

        const result = await window.api.reorderTodo({
          target_date: activeDateRef.current,
          id: activeId,
          over_id: overId
        })

        if (!result.success) {
          setTodos(previousTodos)
          setMonthSummary(previousSummary)
          setError(result.error ?? '순서 변경 실패')
          return false
        }

        return true
      }),
    []
  )

  return {
    todos,
    monthSummary,
    loading,
    error,
    refresh,
    createTodo,
    createTodoRange,
    createTodoMonth,
    toggleCompletion,
    setTodoStatus,
    deleteTodo,
    updateTodoContent,
    moveTodo
  }
}
