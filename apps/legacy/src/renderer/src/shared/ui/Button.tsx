import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@renderer/utils/cn";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: "border-border bg-surface text-fg hover:bg-muted",
  primary: "border-accent bg-accent text-white hover:bg-accent-hover",
  ghost: "border-transparent bg-transparent hover:bg-muted",
  danger: "border-transparent text-danger hover:bg-danger-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-(--radius-btn) border px-3 py-1.5 text-sm transition-colors",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
