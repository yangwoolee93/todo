import { useRef, type MouseEvent } from 'react'
import type { DaySummary } from '@shared/types/todo'
import { getTodoTextClass } from '@renderer/components/TodoStatusIcon'
import { getTodayString, shiftMonth } from '@renderer/utils/dateUtils'

interface MonthBoardProps {
  /** 현재 월 "YYYY-MM" */
  yearMonth: string
  /** 월별 일자 요약 */
  summaries: DaySummary[]
  /** 로딩 중 여부 */
  loading: boolean
  /** 월 변경 */
  onChangeMonth: (yearMonth: string) => void
}

/**
 * 가로 컬럼 월별 모아보기 (F-03)
 * - 일=열, 투두=열 내부 세로 나열, Read-Only
 */
export function MonthBoard({ yearMonth, summaries, loading, onChangeMonth }: MonthBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const today = getTodayString()

  /** 가로 드래그 스크롤 시작 */
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    dragState.current = {
      isDragging: true,
      startX: event.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft
    }
  }

  /** 드래그 중 스크롤 */
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el || !dragState.current.isDragging) return
    const x = event.pageX - el.offsetLeft
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX)
  }

  /** 드래그 종료 */
  const handleMouseUp = () => {
    dragState.current.isDragging = false
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">{yearMonth}</h2>
          <p className="text-xs text-fg-secondary">조회 전용 · 가로 드래그로 스크롤</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost px-2"
            onClick={() => onChangeMonth(shiftMonth(yearMonth, -1))}
            aria-label="이전 달"
          >
            ◀
          </button>
          <button
            type="button"
            className="btn btn-ghost px-2"
            onClick={() => onChangeMonth(shiftMonth(yearMonth, 1))}
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>
      </div>

      {loading && summaries.length === 0 ? (
        <p className="text-sm text-fg-secondary">불러오는 중...</p>
      ) : (
        <div
          ref={scrollRef}
          className="scroll-x-drag flex gap-3 pb-2"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {summaries.map((column) => {
            const isTodayColumn = column.date === today
            return (
              <div
                key={column.date}
                className={`flex w-36 shrink-0 flex-col rounded-[var(--radius-card)] border bg-surface ${
                  isTodayColumn ? 'border-accent ring-2 ring-today-ring/30' : 'border-border'
                }`}
              >
                <div
                  className={`border-b px-2 py-2 text-center text-sm font-semibold ${
                    isTodayColumn ? 'border-accent/30 bg-accent-soft text-accent' : 'border-border text-fg'
                  }`}
                >
                  {column.day}일
                </div>

                <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
                  {column.todos.length === 0 ? (
                    <li className="py-4 text-center text-xs text-fg-muted">—</li>
                  ) : (
                    column.todos.map((todo) => (
                      <li
                        key={`${column.date}-${todo.id}`}
                        className={`rounded px-1.5 py-1 text-xs leading-snug ${getTodoTextClass(todo.status)}`}
                      >
                        {todo.content}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
