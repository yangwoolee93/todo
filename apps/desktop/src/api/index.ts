import { invoke } from "@tauri-apps/api/core";
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
  UpdateTodoContentPayload,
} from "@shared/types/todo";
import type { CreateMemoPayload, MemoItem, UpdateMemoPayload } from "@shared/types/memo";

/** invoke 래퍼 — IpcResult 형태로 통일 */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<IpcResult<T>> {
  try {
    const data = await invoke<T>(command, args);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export const api = {
  getTodosByDate(targetDate: string): Promise<IpcResult<DisplayTodo[]>> {
    return call("get_todos_by_date", { targetDate });
  },

  getMonthSummary(yearMonth: string): Promise<IpcResult<DaySummary[]>> {
    return call("get_month_summary", { yearMonth });
  },

  createTodo(payload: CreateTodoPayload): Promise<IpcResult<TodoItem>> {
    return call("create_todo", {
      content: payload.content,
      targetDate: payload.target_date,
    });
  },

  createTodoRange(payload: CreateTodoRangePayload): Promise<IpcResult<CreateBatchResult>> {
    return call<[number, string]>("create_todo_range", {
      content: payload.content,
      startDate: payload.start_date,
      endDate: payload.end_date,
    }).then((res) => {
      if (!res.success || !res.data) return { success: false, error: res.error };
      const [count, batch_id] = res.data;
      return { success: true, data: { count, batch_id } };
    });
  },

  createTodoMonth(payload: CreateTodoMonthPayload): Promise<IpcResult<CreateBatchResult>> {
    return call<[number, string]>("create_todo_month", {
      content: payload.content,
      yearMonth: payload.year_month,
    }).then((res) => {
      if (!res.success || !res.data) return { success: false, error: res.error };
      const [count, batch_id] = res.data;
      return { success: true, data: { count, batch_id } };
    });
  },

  toggleCompletion(todoId: number): Promise<IpcResult> {
    return call("toggle_completion", { todoId });
  },

  setTodoStatus(payload: SetTodoStatusPayload): Promise<IpcResult> {
    return call("set_todo_status", { id: payload.id, status: payload.status });
  },

  deleteTodo(payload: DeleteTodoPayload): Promise<IpcResult> {
    return call("delete_todo", { id: payload.id, scope: payload.scope });
  },

  updateTodoContent(payload: UpdateTodoContentPayload): Promise<IpcResult> {
    return call("update_todo_content", { id: payload.id, content: payload.content });
  },

  reorderTodo(payload: ReorderTodoPayload): Promise<IpcResult> {
    return call("reorder_todo", {
      targetDate: payload.target_date,
      id: payload.id,
      overId: payload.over_id,
    });
  },

  async exportJson(): Promise<IpcResult<{ filePath?: string }>> {
    const res = await call<string | null>("export_json");
    if (!res.success) return { success: false, error: res.error };
    return { success: true, data: { filePath: res.data ?? undefined } };
  },

  async importJson(): Promise<IpcResult<{ filePath?: string }>> {
    const res = await call<string | null>("import_json");
    if (!res.success) return { success: false, error: res.error };
    return { success: true, data: { filePath: res.data ?? undefined } };
  },

  listMemos(): Promise<IpcResult<MemoItem[]>> {
    return call("list_memos");
  },

  createMemo(payload: CreateMemoPayload): Promise<IpcResult<MemoItem>> {
    return call("create_memo", {
      kind: payload.kind,
      title: payload.title,
      note: payload.note,
    });
  },

  updateMemo(payload: UpdateMemoPayload): Promise<IpcResult> {
    return call("update_memo", {
      id: payload.id,
      title: payload.title,
      note: payload.note,
    });
  },

  deleteMemo(id: number): Promise<IpcResult> {
    return call("delete_memo", { id });
  },
};

export type AppApi = typeof api;
