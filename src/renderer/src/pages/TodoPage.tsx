import { MonthBoard } from "@renderer/widgets/todo/month";
import { YearBoard } from "@renderer/widgets/todo/year";
import { useState } from "react";

export default function TodoPage() {
  const now = new Date();
  const thisYear = now.getFullYear();

  const [year, setYear] = useState(thisYear); // 선택된 년
  const [isYearView, setIsYearView] = useState(false); // 년 선택화면 열림 여부

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="m-6 mb-2 flex flex-col gap-2">
        {/* 년 */}
        <YearBoard
          //
          year={year}
          onOpenYearView={() => {
            setIsYearView(true);
          }}
          isYearView={isYearView}
          onSelectYear={(year) => {
            setYear(year);
            setIsYearView(false);
          }}
        />
        {/* 월 */}
        <MonthBoard />
      </div>
      {/* 일 */}
    </div>
  );
}
