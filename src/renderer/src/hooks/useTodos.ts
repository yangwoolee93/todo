import { useCallback, useEffect, useState } from 'react'
import type {
  CreateTodoMonthPayload,
  CreateTodoRangePayload,
  DaySummary,
  DeleteTodoScope,
  DisplayTodo
} from '@shared/types/todo'

interface UseTodosOptions {
  activeDate: string
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
  toggleComplete: (todoId: number) => Promise<boolean>
  deleteTodo: (todoId: number, scope: DeleteTodoScope) => Promise<boolean>
  updateTodoContent: (todoId: number, content: string) => Promise<boolean>
  reorderTodo: (todoId: number, direction: 'up' | 'down') => Promise<boolean>
}

/** window.api IPC 래퍼 Hook */
export function useTodos({ activeDate, summaryMonth }: UseTodosOptions): UseTodosReturn {
  const [todos, setTodos] = useState<DisplayTodo[]>([])
  const [monthSummary, setMonthSummary] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const yearMonth = summaryMonth ?? activeDate.slice(0, 7)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [dailyResult, monthResult] = await Promise.all([
        window.api.getTodosByDate(activeDate),
        window.api.getMonthSummary(yearMonth)
      ])

      if (!dailyResult.success) throw new Error(dailyResult.error ?? '일별 조회 실패')
      if (!monthResult.success) throw new Error(monthResult.error ?? '월별 조회 실패')

      setTodos(dailyResult.data ?? [])
      setMonthSummary(monthResult.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [activeDate, yearMonth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createTodo = useCallback(
    async (content: string, targetDate: string): Promise<boolean> => {
      const result = await window.api.createTodo({ content, target_date: targetDate })
      if (!result.success) {
        setError(result.error ?? '생성 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const createTodoRange = useCallback(
    async (payload: CreateTodoRangePayload): Promise<boolean> => {
      const result = await window.api.createTodoRange(payload)
      if (!result.success) {
        setError(result.error ?? '기간 일괄 생성 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const createTodoMonth = useCallback(
    async (payload: CreateTodoMonthPayload): Promise<boolean> => {
      const result = await window.api.createTodoMonth(payload)
      if (!result.success) {
        setError(result.error ?? '한 달 일괄 생성 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const toggleComplete = useCallback(
    async (todoId: number): Promise<boolean> => {
      const result = await window.api.toggleComplete(todoId)
      if (!result.success) {
        setError(result.error ?? '체크 변경 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const deleteTodo = useCallback(
    async (todoId: number, scope: DeleteTodoScope): Promise<boolean> => {
      const result = await window.api.deleteTodo({ id: todoId, scope })
      if (!result.success) {
        setError(result.error ?? '삭제 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const updateTodoContent = useCallback(
    async (todoId: number, content: string): Promise<boolean> => {
      const result = await window.api.updateTodoContent({ id: todoId, content })
      if (!result.success) {
        setError(result.error ?? '수정 실패')
        return false
      }
      await refresh()
      return true
    },
    [refresh]
  )

  const reorderTodo = useCallback(
    async (todoId: number, direction: 'up' | 'down'): Promise<boolean> => {
      const result = await window.api.reorderTodo({
        target_date: activeDate,
        id: todoId,
        direction
      })
      if (!result.success) {
        setError(result.error ?? '순서 변경 실패')
        return false
      }
      await refresh()
      return true
    },
    [activeDate, refresh]
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
    toggleComplete,
    deleteTodo,
    updateTodoContent,
    reorderTodo
  }
}
