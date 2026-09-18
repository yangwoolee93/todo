import type { MemoItem } from "./memo";

/**
 * 투두 상태
 * - pending: 미완료
 * - completed: 완료
 * - failed: 실패(못함)
 */
export type TodoStatus = "pending" | "completed" | "failed";

/**
 * 투두 항목 원본 데이터 모델
 * id는 기기 간 병합을 위한 전역 고유 문자열(UUID)이다.
 */
export interface TodoItem {
  id: string;
  content: string;
  target_date: string;
  status: TodoStatus;
  created_at: number;
  sort_order: number;
  batch_id: string | null;
}

/** 디스크에 저장되는 JSON 파일 전체 스키마 */
export interface TodoDatabase {
  todos: TodoItem[];
  memos: MemoItem[];
  last_exported_at?: number | null;
  last_imported_at?: number | null;
}

/** 설정 화면에 쓰는 보내기·불러오기 최근 시각 */
export interface DataTransferMeta {
  last_exported_at: number | null;
  last_imported_at: number | null;
}

/** 병합 불러오기 결과 — 추가·갱신·삭제된 항목 수 */
export interface ImportMergeResult {
  file_path: string;
  added: number;
  updated: number;
  deleted: number;
}

export interface DisplayTodo {
  id: string;
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
  id: string;
  scope: DeleteTodoScope;
}

export interface UpdateTodoContentPayload {
  id: string;
  content: string;
}

export interface TodoSpan {
  start_date: string;
  end_date: string;
}

export interface UpdateTodoPayload {
  id: string;
  content: string;
  start_date: string;
  end_date: string;
}

export interface SetTodoStatusPayload {
  id: string;
  status: TodoStatus;
}

export interface ReorderTodoPayload {
  target_date: string;
  id: string;
  over_id: string;
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
