import { cn } from "@renderer/utils/cn";

export default function GoToTodayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn("text-sm", "text-accent hover:text-accent-hover")}
      onClick={onClick}
    >
      오늘로
    </button>
  );
}
