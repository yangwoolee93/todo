import { cn } from "@renderer/utils/cn";
import IconWin from "@renderer/assets/icon_win.png";
import IconMac from "@renderer/assets/icon_mac.png";
import { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import { Tab } from "@renderer/shared/ui";

const AppHeader = () => {
  const view = useUIStore((s) => s.view);
  const goTodayView = useUIStore((s) => s.goTodayView);
  const goMonthView = useUIStore((s) => s.goMonthView);
  const goMemoView = useUIStore((s) => s.goMemoView);
  const goScheduleView = useUIStore((s) => s.goScheduleView);
  const goSettingsView = useUIStore((s) => s.goSettingsView);

  const tabs: { id: AppView; label: string; onClick: () => void }[] = [
    { id: "today", label: "오늘", onClick: () => goTodayView() },
    { id: "month", label: "월별", onClick: () => goMonthView() },
    { id: "schedule", label: "일정", onClick: () => goScheduleView() },
    { id: "memo", label: "메모", onClick: () => goMemoView() },
    { id: "settings", label: "설정", onClick: () => goSettingsView() },
  ];

  const isWin = window.electron?.platform === "win32";

  const WinLogo = () => {
    return (
      <div
        className={cn("flex flex-1 h-full items-center gap-2 pl-4", "[-webkit-app-region:drag]")}
      >
        <img src={IconWin} className="w-5 h-5 mr-1" />
        <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">할 일</span>
      </div>
    );
  };

  const MacLogo = () => {
    return (
      <div
        className={cn("flex flex-1 h-full items-center gap-1.5 pl-20", "[-webkit-app-region:drag]")}
      >
        <img src={IconMac} className="w-6 h-6" />
        <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">할 일</span>
      </div>
    );
  };

  return (
    <header className={cn("relative flex shrink-0 items-center justify-between h-11")}>
      {isWin ? <WinLogo /> : <MacLogo />}

      <nav className={cn("flex gap-1", isWin ? "pr-36" : "pr-2")}>
        {tabs.map((tab) => (
          <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
            {tab.label}
          </Tab>
        ))}
      </nav>
    </header>
  );
};

export default AppHeader;
