import { Card } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";

export default function DesignPage() {
  return (
    <div className={cn("flex flex-1 flex-col")}>
      {/* 년월 */}
      <div className="flex gap-2 m-6">
        <div>2026년</div> <div>8월</div>
      </div>
      {/* 일 */}
      <div className={cn("flex gap-2 overflow-hidden overflow-x-scroll h-34", "scrollbar")}>
        {Array.from({ length: 31 }).map((_, index) => (
          <Card
            key={index}
            className={cn("w-20 h-30 flex-shrink-0 flex flex-col items-center justify-center")}
          >
            <div>{index + 1}</div>
            <div>N요일</div>
          </Card>
        ))}
      </div>
      <Card className={cn("flex-1 m-6")} />
    </div>
  );
}
