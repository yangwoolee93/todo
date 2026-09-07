import { cn } from "@renderer/utils/cn";
import GoToTodayButton from "../GoToTodayButton";
import { Button } from "@renderer/shared/ui";
import { YEARS } from "./constants";
import { useState } from "react";
import YearCell from "./YearCell";

export default function YearBoard({
  year,
  isYearView,
  onOpenYearView,
  onSelectYear,
}: {
  year: number;
  isYearView: boolean;
  onOpenYearView: () => void;
  onSelectYear: (year: number) => void;
}) {
  const thisYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(year);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4">
        <div
          className={cn(
            "w-fit cursor-pointer rounded-(--radius-btn) bg-surface px-3 py-1 text-2xl font-medium text-fg",
            "hover:bg-muted",
            "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
          )}
          onClick={onOpenYearView}
        >
          {year}년
        </div>
        {isYearView && selectedYear !== thisYear && (
          <GoToTodayButton onClick={() => setSelectedYear(thisYear)} />
        )}
      </div>
      {isYearView && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="scrollbar min-h-0 flex-row-reverse overflow-y-auto">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))] gap-2">
              {YEARS.map((item) => {
                const isSelected = item === selectedYear;
                return (
                  <YearCell
                    key={item}
                    item={item}
                    isSelected={isSelected}
                    onClick={setSelectedYear}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex shrink-0 justify-end">
            <Button variant="primary" onClick={() => onSelectYear(selectedYear)}>
              선택
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
