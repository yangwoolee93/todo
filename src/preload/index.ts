import { contextBridge, ipcRenderer } from 'electron'
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
  TodoItem,
  UpdateTodoContentPayload
} from '@shared/types/todo'

const api = {
  getTodosByDate(targetDate: string): Promise<IpcResult<DisplayTodo[]>> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_TODOS_BY_DATE, targetDate)
  },

  getMonthSummary(yearMonth: string): Promise<IpcResult<DaySummary[]>> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_MONTH_SUMMARY, yearMonth)
  },

  createTodo(payload: CreateTodoPayload): Promise<IpcResult<TodoItem>> {
    return ipcRenderer.invoke(IPC_CHANNELS.CREATE_TODO, payload)
  },

  createTodoRange(payload: CreateTodoRangePayload): Promise<IpcResult<CreateBatchResult>> {
    return ipcRenderer.invoke(IPC_CHANNELS.CREATE_TODO_RANGE, payload)
  },

  createTodoMonth(payload: CreateTodoMonthPayload): Promise<IpcResult<CreateBatchResult>> {
    return ipcRenderer.invoke(IPC_CHANNELS.CREATE_TODO_MONTH, payload)
  },

  toggleComplete(todoId: number): Promise<IpcResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_COMPLETE, todoId)
  },

  deleteTodo(payload: DeleteTodoPayload): Promise<IpcResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_TODO, payload)
  },

  updateTodoContent(payload: UpdateTodoContentPayload): Promise<IpcResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TODO_CONTENT, payload)
  },

  reorderTodo(payload: ReorderTodoPayload): Promise<IpcResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.REORDER_TODO, payload)
  },

  exportJson(): Promise<IpcResult<{ filePath?: string }>> {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_JSON)
  },

  exportSql(): Promise<IpcResult<{ filePath?: string }>> {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SQL)
  },

  importJson(): Promise<IpcResult<{ filePath?: string }>> {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_JSON)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type TodoApi = typeof api
