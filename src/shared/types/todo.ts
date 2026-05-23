/**
 * 투두 항목 원본 데이터 모델
 * - 모든 투두는 특정 날짜(target_date)에 1:1로 표시
 * - batch_id가 같으면 기간/한 달 일괄 추가로 묶인 항목
 */
export interface TodoItem {
  /** 고유 ID */
  id: number
  /** 1줄 이내 투두 내용 */
  content: string
  /** "YYYY-MM-DD" — 표시 대상 날짜 */
  target_date: string
  /** 완료(체크) 여부 */
  is_completed: boolean
  /** 생성 시각 (밀리초) */
  created_at: number
  /** 표시 순서 (작을수록 위) */
  sort_order: number
  /** 일괄 추가 묶음 ID — null이면 하루 단독 추가 */
  batch_id: string | null
}

/** JSON 파일 최상위 저장 구조 */
export interface TodoStore {
  todos: TodoItem[]
}

/** 화면에 표시할 투두 (조회 DTO) */
export interface DisplayTodo {
  id: number
  content: string
  is_completed: boolean
  sort_order: number
  created_at: number
  batch_id: string | null
}

/** 하루 1건 추가 */
export interface CreateTodoPayload {
  content: string
  target_date: string
}

/** 기간 일괄 추가 */
export interface CreateTodoRangePayload {
  content: string
  start_date: string
  end_date: string
}

/** 한 달 일괄 추가 */
export interface CreateTodoMonthPayload {
  content: string
  /** "YYYY-MM" */
  year_month: string
}

/** 일괄 생성 결과 */
export interface CreateBatchResult {
  count: number
  batch_id: string
}

/** 삭제 범위 — 해당일만 / 묶음 전체 */
export type DeleteTodoScope = 'day' | 'batch'

export interface DeleteTodoPayload {
  id: number
  scope: DeleteTodoScope
}

/** 내용 수정 — batch_id 있으면 묶음 전체 일괄 수정 */
export interface UpdateTodoContentPayload {
  id: number
  content: string
}

/** 순서 변경 */
export interface ReorderTodoPayload {
  target_date: string
  id: number
  direction: 'up' | 'down'
}

/** 월별 요약 행 */
export interface DaySummary {
  date: string
  day: number
  todos: DisplayTodo[]
}

/** IPC 공통 응답 */
export interface IpcResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
