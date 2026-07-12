import type { ButtonHTMLAttributes } from "react";
import { cn } from "@renderer/utils/cn";

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** 탭 버튼 — 상단 네비게이션, 모달 내부 모드 전환 등 공용 */
export function Tab({ active = false, className, type = "button", ...props }: TabProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-(--radius-btn) px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-muted hover:text-fg",
        active && "bg-accent-soft text-accent font-medium",
        className,
      )}
      {...props}
    />
  );
}
