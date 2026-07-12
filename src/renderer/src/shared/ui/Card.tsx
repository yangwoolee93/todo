import type { HTMLAttributes } from "react";
import { cn } from "@renderer/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section";
}

export function Card({ as = "div", className, ...props }: CardProps) {
  const Component = as;
  return (
    <Component
      className={cn("rounded-(--radius-card) border border-border bg-surface p-4", className)}
      {...props}
    />
  );
}
