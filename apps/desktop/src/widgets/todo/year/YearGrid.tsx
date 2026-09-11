import { Button } from "@renderer/shared/ui";
import { YEARS } from "./constants";
import YearCell from "./YearCell";

export default function YearGrid({
  year: _year,
  selectedYear,
  setSelectedYear,
  onSelectYear,
}: {
  year: number;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onSelectYear: () => void;
}) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="scrollbar min-h-0 flex-row-reverse overflow-y-auto">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))] gap-2">
          {YEARS.map((item) => {
            const isSelected = item === selectedYear;
            return (
              <YearCell key={item} item={item} isSelected={isSelected} onClick={setSelectedYear} />
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex shrink-0 justify-end">
        <Button variant="primary" onClick={onSelectYear}>
          선택
        </Button>
      </div>
    </div>
  );
}
