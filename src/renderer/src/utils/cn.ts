import { twMerge } from "tailwind-merge";

type ClassValue = string | undefined | null | false;

/** Tailwind 클래스를 병합한다. 충돌 시 뒤쪽 값이 우선한다. */
export function cn(...classes: ClassValue[]): string {
  return twMerge(classes.filter((value): value is string => Boolean(value)).join(" "));
}
