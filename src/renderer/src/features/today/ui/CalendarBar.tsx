import { useRef, type MouseEvent } from 'react'
import { getDatesInMonth, shiftMonth, toShortLabel, toYearMonth } from '@renderer/utils/dateUtils'
import { Button } from '@renderer/shared/ui'

interface CalendarBarProps {
  /** 현재 활성 날짜 "YYYY-MM-DD" */
  activeDate: string
  /** 날짜 선택 시 호출 */
  onSelectDate: (date: string) => void
  /** 월 변경 시 호출 (YYYY-MM) */
  onChangeMonth: (yearMonth: string) => void
}

/**
 * 가로 스크롤 캘린더 바 (F-01)
 * - 선택 월의 일자를 가로 나열, 드래그 스크롤, 클릭으로 날짜 지정
 */
export function CalendarBar({ activeDate, onSelectDate, onChangeMonth }: CalendarBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 })
  const yearMonth = toYearMonth(activeDate)
  const dates = getDatesInMonth(yearMonth)

  /** 마우스 드래그 시작 — 가로 스크롤 */
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return

    dragState.current = {
      isDragging: true,
      startX: event.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft
    }
  }

  /** 드래그 중 스크롤 위치 갱신 */
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el || !dragState.current.isDragging) return

    const x = event.pageX - el.offsetLeft
    const walk = x - dragState.current.startX
    el.scrollLeft = dragState.current.scrollLeft - walk
  }

  /** 드래그 종료 */
  const handleMouseUp = () => {
    dragState.current.isDragging = false
  }

  /** 이전 월로 이동 */
  const goPrevMonth = () => onChangeMonth(shiftMonth(yearMonth, -1))

  /** 다음 월로 이동 */
  const goNextMonth = () => onChangeMonth(shiftMonth(yearMonth, 1))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="px-2" onClick={goPrevMonth} aria-label="이전 달">
          ◀
        </Button>
        <span className="text-sm font-medium text-fg">{yearMonth}</span>
        <Button variant="ghost" className="px-2" onClick={goNextMonth} aria-label="다음 달">
          ▶
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar flex cursor-grab gap-2 overflow-x-auto pb-1 active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {dates.map((date) => {
          const isActive = date === activeDate
          return (
            <button
              key={date}
              type="button"
              className={`shrink-0 rounded-(--radius-btn) border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-surface text-fg hover:bg-muted'
              }`}
              onClick={() => onSelectDate(date)}
            >
              {toShortLabel(date)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
