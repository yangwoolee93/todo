import { cn } from "@renderer/utils/cn";
import IconWin from "@renderer/assets/icon_win.png";
import IconMac from "@renderer/assets/icon_mac.png";
import { AppView } from "@renderer/types/views";
import { useUIStore } from "@renderer/stores/useUIStore";
import { Tab } from "@renderer/shared/ui";

const AppHeader = () => {
  const view = useUIStore((s) => s.view);
  const goDesignView = useUIStore((s) => s.goDesignView);
  const goMemoView = useUIStore((s) => s.goMemoView);
  const goScheduleView = useUIStore((s) => s.goScheduleView);
  const goSettingsView = useUIStore((s) => s.goSettingsView);

  const tabs: { id: AppView; label: string; onClick: () => void }[] = [
    { id: "design", label: "디자인", onClick: () => goDesignView() },
    { id: "schedule", label: "일정", onClick: () => goScheduleView() },
    { id: "memo", label: "메모", onClick: () => goMemoView() },
    { id: "settings", label: "설정", onClick: () => goSettingsView() },
  ];

  const isWin = window.electron?.platform === "win32";

  const WinHeader = () => {
    return (
      <header className={cn("h-12 flex items-center gap-2 border-b border-border")}>
        <div className={cn("flex pl-4", "[-webkit-app-region:drag]")}>
          <img src={IconWin} className="w-5 h-5 mr-1" />
        </div>
        <nav className={cn("flex gap-1")}>
          {tabs.map((tab) => (
            <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
              {tab.label}
            </Tab>
          ))}
        </nav>
        <div className="flex-1 h-full [-webkit-app-region:drag]" />
      </header>
    );
  };

  const MacHeader = () => {
    return (
      <header className={cn("relative flex shrink-0 items-center justify-between h-11")}>
        <div
          className={cn(
            "flex flex-1 h-full items-center gap-1.5 pl-20",
            "[-webkit-app-region:drag]",
          )}
        >
          <img src={IconMac} className="w-6 h-6" />
          <span className="truncate text-md font-bold tracking-[-0.8px] text-fg">할 일</span>
        </div>
        <nav className={cn("flex gap-1 pr-2")}>
          {tabs.map((tab) => (
            <Tab key={tab.id} active={view === tab.id} onClick={tab.onClick}>
              {tab.label}
            </Tab>
          ))}
        </nav>
      </header>
    );
  };

  return isWin ? <WinHeader /> : <MacHeader />;
};

export default AppHeader;
