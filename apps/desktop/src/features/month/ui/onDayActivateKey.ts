import type { KeyboardEvent } from "react";

/** Enter / Space로 날짜 활성화 (role=button div용) */
export function onDayActivateKey(
  event: KeyboardEvent,
  date: string,
  onDateClick: (date: string) => void,
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onDateClick(date);
  }
}
