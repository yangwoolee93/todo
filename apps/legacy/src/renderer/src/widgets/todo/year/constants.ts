export const YEAR_START = 2026;
export const YEAR_END = 2046;
export const YEARS: number[] = Array.from(
  { length: YEAR_END - YEAR_START + 1 },
  (_, index) => YEAR_START + index,
);
