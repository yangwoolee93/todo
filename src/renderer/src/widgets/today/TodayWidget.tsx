import { TodayHeader } from "@renderer/features/today";

export default function TodayWidget() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <TodayHeader />
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-4 pr-[var(--scrollbar-gap)]">
        <div className="scrollbar scrollbar-y-inset min-h-0 flex-1">
          {/* <TodoList
            todos={todos}
            loading={loading}
            onToggleCompletion={onToggleCompletion}
            onSetStatus={onSetStatus}
            onDelete={onDelete}
            onUpdateContent={onUpdateContent}
            onReorder={onReorder}
            onDuplicate={onDuplicate}
          /> */}
          <p>TodoList</p>
        </div>
      </div>
    </div>
  );
}
