import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function GlassButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "glass-rim-sm bg-base/4",
        className,
      )}
      {...props}
    />
  );
}
