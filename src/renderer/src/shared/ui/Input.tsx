import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@renderer/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-(--radius-btn) border border-border bg-surface px-3 py-2 text-sm text-fg",
        "placeholder:text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
