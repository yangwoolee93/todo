import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { ChevronLeftIcon, ChevronRightIcon } from "./ChevronIcons";
import {
  getTodayString,
  toFullLabel,
  isToday,
} from "@renderer/utils/dateUtils";

export default function TodayHeader() {
  const activeDate = useUIStore((s) => s.activeDate);
  const goTodayDate = useUIStore((s) => s.goTodayDate);
  const goPrevDate = useUIStore((s) => s.goPrevDate);
  const goNextDate = useUIStore((s) => s.goNextDate);
  const openDatePicker = useUIStore((s) => s.openDatePicker);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const todoCount = useTodoStore((s) => s.todos.length);

  const showingToday = isToday(activeDate);

  return (
    <div className="card shrink-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent cursor-default">
                {showingToday ? "오늘" : "선택한 날"}
              </span>

              {!showingToday && (
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-0.5 text-xs bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"
                  onClick={goTodayDate}
                >
                  오늘로
                </button>
              )}
            </div>

            <h2 className="text-xl font-semibold text-fg">
              {toFullLabel(activeDate)}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-1 text-xs pl-1.5"
              aria-label="전날"
              onClick={goPrevDate}
            >
              <ChevronLeftIcon />
              전날
            </button>

            <button
              type="button"
              className="btn text-xs"
              onClick={openDatePicker}
            >
              다른 날짜
            </button>

            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-1 text-xs pr-1.5"
              aria-label="다음날"
              onClick={goNextDate}
            >
              다음날
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-secondary">{todoCount}건의 할 일</p>

          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={openAddModal}
          >
            할 일 추가
          </button>
        </div>
      </div>
    </div>
  );
}
