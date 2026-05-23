import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc/channels'
import type {
  CreateBatchResult,
  CreateTodoMonthPayload,
  CreateTodoPayload,
  CreateTodoRangePayload,
  DaySummary,
  DeleteTodoPayload,
  DisplayTodo,
  IpcResult,
  ReorderTodoPayload,
  SetTodoStatusPayload,
  TodoItem,
  UpdateTodoContentPayload
} from '@shared/types/todo'
import { exportToJson, exportToSql, importFromJson } from './database/exportService'
import {
  createTodo,
  createTodosForMonth,
  createTodosInRange,
  deleteTodo,
  getMonthSummary,
  getTodosByDate,
  reorderTodo,
  setTodoStatus,
  toggleCompletion,
  updateTodoContent
} from './database/todoRepository'

function ok<T>(data?: T): IpcResult<T> {
  return { success: true, data }
}

function fail(error: string): IpcResult<never> {
  return { success: false, error }
}

/** 모든 IPC 채널 핸들러 등록 */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.GET_TODOS_BY_DATE,
    (_event, targetDate: string): IpcResult<DisplayTodo[]> => {
      try {
        return ok(getTodosByDate(targetDate))
      } catch (error) {
        return fail(error instanceof Error ? error.message : '조회 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GET_MONTH_SUMMARY,
    (_event, yearMonth: string): IpcResult<DaySummary[]> => {
      try {
        return ok(getMonthSummary(yearMonth))
      } catch (error) {
        return fail(error instanceof Error ? error.message : '월별 조회 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_TODO,
    (_event, payload: CreateTodoPayload): IpcResult<TodoItem> => {
      try {
        const created = createTodo(payload)
        if (!created) {
          return fail('입력 내용이 비어 있거나 날짜가 올바르지 않습니다.')
        }
        return ok(created)
      } catch (error) {
        return fail(error instanceof Error ? error.message : '생성 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_TODO_RANGE,
    (_event, payload: CreateTodoRangePayload): IpcResult<CreateBatchResult> => {
      try {
        const result = createTodosInRange(payload)
        if (!result) {
          return fail('입력 내용이 비어 있습니다.')
        }
        return ok(result)
      } catch (error) {
        return fail(error instanceof Error ? error.message : '기간 일괄 생성 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CREATE_TODO_MONTH,
    (_event, payload: CreateTodoMonthPayload): IpcResult<CreateBatchResult> => {
      try {
        const result = createTodosForMonth(payload)
        if (!result) {
          return fail('입력 내용이 비어 있습니다.')
        }
        return ok(result)
      } catch (error) {
        return fail(error instanceof Error ? error.message : '한 달 일괄 생성 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TOGGLE_COMPLETION,
    (_event, todoId: number): IpcResult => {
      try {
        const changed = toggleCompletion(todoId)
        if (!changed) {
          return fail('항목을 찾을 수 없거나 상태를 변경할 수 없습니다.')
        }
        return ok()
      } catch (error) {
        return fail(error instanceof Error ? error.message : '상태 변경 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SET_TODO_STATUS,
    (_event, payload: SetTodoStatusPayload): IpcResult => {
      try {
        const changed = setTodoStatus(payload.id, payload.status)
        if (!changed) {
          return fail('항목을 찾을 수 없거나 동일한 상태입니다.')
        }
        return ok()
      } catch (error) {
        return fail(error instanceof Error ? error.message : '상태 변경 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DELETE_TODO,
    (_event, payload: DeleteTodoPayload): IpcResult => {
      try {
        const changed = deleteTodo(payload.id, payload.scope)
        if (!changed) {
          return fail('항목을 찾을 수 없습니다.')
        }
        return ok()
      } catch (error) {
        return fail(error instanceof Error ? error.message : '삭제 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_TODO_CONTENT,
    (_event, payload: UpdateTodoContentPayload): IpcResult => {
      try {
        const changed = updateTodoContent(payload.id, payload.content)
        if (!changed) {
          return fail('수정할 내용이 비어 있거나 항목을 찾을 수 없습니다.')
        }
        return ok()
      } catch (error) {
        return fail(error instanceof Error ? error.message : '수정 실패')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REORDER_TODO,
    (_event, payload: ReorderTodoPayload): IpcResult => {
      try {
        const changed = reorderTodo(payload.target_date, payload.id, payload.direction)
        if (!changed) {
          return fail('순서를 변경할 수 없습니다.')
        }
        return ok()
      } catch (error) {
        return fail(error instanceof Error ? error.message : '순서 변경 실패')
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.EXPORT_JSON, async (): Promise<IpcResult<{ filePath?: string }>> => {
    const result = await exportToJson()
    if (result.cancelled) return ok({ filePath: undefined })
    if (!result.success) return fail(result.error ?? 'JSON 익스포트 실패')
    return ok({ filePath: result.filePath })
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_SQL, async (): Promise<IpcResult<{ filePath?: string }>> => {
    const result = await exportToSql()
    if (result.cancelled) return ok({ filePath: undefined })
    if (!result.success) return fail(result.error ?? 'SQL 익스포트 실패')
    return ok({ filePath: result.filePath })
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_JSON, async (): Promise<IpcResult<{ filePath?: string }>> => {
    const result = await importFromJson()
    if (result.cancelled) return ok({ filePath: undefined })
    if (!result.success) return fail(result.error ?? 'JSON 임포트 실패')
    return ok({ filePath: result.filePath })
  })
}
