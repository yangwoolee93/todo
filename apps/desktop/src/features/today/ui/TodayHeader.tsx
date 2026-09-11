import { useUIStore } from "@renderer/stores/useUIStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { toFullLabel, isToday } from "@renderer/utils/dateUtils";
import { Card, Button, ChevronLeftIcon, ChevronRightIcon } from "@renderer/shared/ui";

export default function TodayHeader() {
  const activeDate = useUIStore((s) => s.activeDate);
  const goTodayDate = useUIStore((s) => s.goTodayDate);
  const goPrevDate = useUIStore((s) => s.goPrevDate);
  const goNextDate = useUIStore((s) => s.goNextDate);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const todoCount = useTodoStore((s) => s.todos.length);

  const showingToday = isToday(activeDate);

  return (
    <Card className="shrink-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-fg">{toFullLabel(activeDate)}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {!showingToday && (
              <Button
                variant="ghost"
                className="px-2 py-0.5 text-xs bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"
                onClick={goTodayDate}
              >
                오늘로
              </Button>
            )}

            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 text-xs pl-1.5"
              aria-label="전날"
              onClick={goPrevDate}
            >
              <ChevronLeftIcon />
              전날
            </Button>

            <Button
              variant="ghost"
              className="inline-flex items-center gap-1 text-xs pr-1.5"
              aria-label="다음날"
              onClick={goNextDate}
            >
              다음날
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-secondary">{todoCount}건의 할 일</p>

          <Button variant="primary" className="text-sm" onClick={openAddModal}>
            할 일 추가
          </Button>
        </div>
      </div>
    </Card>
  );
}
