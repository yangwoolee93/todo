/**
 * 투두 상태
 * - pending: 미완료
 * - completed: 완료
 * - failed: 실패(못함)
 */
export type TodoStatus = "pending" | "completed" | "failed";

/**
 * 투두 항목 원본 데이터 모델
 */
export interface TodoItem {
  id: number;
  content: string;
  target_date: string;
  status: TodoStatus;
  created_at: number;
  sort_order: number;
  batch_id: string | null;
}

export interface TodoStore {
  todos: TodoItem[];
}

export interface DisplayTodo {
  id: number;
  content: string;
  status: TodoStatus;
  sort_order: number;
  created_at: number;
  batch_id: string | null;
}

export interface CreateTodoPayload {
  content: string;
  target_date: string;
}

export interface CreateTodoRangePayload {
  content: string;
  start_date: string;
  end_date: string;
}

export interface CreateTodoMonthPayload {
  content: string;
  year_month: string;
}

export interface CreateBatchResult {
  count: number;
  batch_id: string;
}

export type DeleteTodoScope = "day" | "batch";

export interface DeleteTodoPayload {
  id: number;
  scope: DeleteTodoScope;
}

export interface UpdateTodoContentPayload {
  id: number;
  content: string;
}

export interface SetTodoStatusPayload {
  id: number;
  status: TodoStatus;
}

export interface ReorderTodoPayload {
  target_date: string;
  id: number;
  over_id: number;
}

export interface DaySummary {
  date: string;
  day: number;
  todos: DisplayTodo[];
}

export interface IpcResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
