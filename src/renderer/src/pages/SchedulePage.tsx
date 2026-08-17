import { ScheduleToolbar } from "@renderer/widgets/schedule";

export default function SchedulePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <ScheduleToolbar />
    </div>
  );
}
