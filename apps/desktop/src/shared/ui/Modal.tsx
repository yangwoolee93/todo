import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@renderer/utils/cn";

type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  size?: ModalSize;
  className?: string;
  children: ReactNode;
}

/**
 * 공용 모달 — Radix Dialog 기반
 * - Escape 닫기, 포커스 트랩, 배경 클릭 닫기를 Radix가 처리
 * - 시각적 스타일(카드/오버레이)은 기존 디자인 토큰 그대로 유지
 */
export function Modal({ open, onClose, label, size = "sm", className, children }: ModalProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          aria-label={label}
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "max-h-[90vh] overflow-auto rounded-(--radius-card) border border-border bg-surface p-4 shadow-xl outline-none",
            SIZE_CLASS[size],
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** 모달 제목 — Radix Dialog.Title에 연결 (스타일은 호출부에서 지정) */
export function ModalTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Title asChild>
      <h2 className={className}>{children}</h2>
    </DialogPrimitive.Title>
  );
}
