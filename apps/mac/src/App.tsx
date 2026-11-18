import { SidebarIcon } from "@phosphor-icons/react";
import { GlassButton } from "./components/GlassButton";
import { useThemeSync } from "./hooks/useThemeSync";
import { cn } from "./utils/cn";

export function App() {
  useThemeSync();

  return (
    <div
      className={cn(
        "bg-base/95 rounded-3xl",
        "relative flex h-full overflow-hidden",
      )}
    >
      {/* 제목막대 */}
      <div
        className={cn(
          "bg-accent/70-",
          "absolute top-0 left-0 right-0 h-11 z-0",
        )}
        data-tauri-drag-region
      ></div>
      {/* 사이드바 */}
      <div
        className={cn(
          "bg-fg/1",
          "w-60 flex flex-col m-2 rounded-2xl",
          "overflow-hidden",
          "glass-rim-lg",
        )}
      >
        {/* 사이드바 헤더 */}
        <div className={cn("bg-green-200/50-", "")}>
          <div
            className={cn(
              "bg-purple-200/50-",
              "h-full flex justify-end items-center p-1.5 px-2",
            )}
          >
            <div className="flex hover:bg-fg/10 px-1 rounded-full">
              <SidebarIcon aria-hidden="true" size={22} weight="light" />
            </div>
          </div>
        </div>
        {/* 메뉴 */}
      </div>
      {/* 컨텐츠 */}
      <div className={cn("bg-red-200/50-", "flex flex-col flex-1")}>
        {/* 컨텐츠 내 헤더(컨트롤영역) */}
        <div className={cn("bg-green-200/50-", "flex item-center")}>
          <div
            className={cn(
              "bg-purple-200/50-",
              "mt-2 flex flex-1 gap-2 items-center rounded-full",
            )}
          >
            <GlassButton className="flex p-1.5 px-2 hover:bg-fg/10">
              <SidebarIcon aria-hidden="true" size={22} weight="light" />
            </GlassButton>
            <GlassButton className="flex p-1.5 px-2">ㄹㅇㄹㄴ</GlassButton>
            <button className="glass-rim-sm rounded-full p-1.5 px-2">
              ㄹㅇㄹㄴ
            </button>
          </div>
        </div>
        {/* 진짜 컨텐츠 */}
        <div className={cn("bg-amber-200/50-", "flex-1")}>
          <GlassButton className="w-200 h-160 rounded-2xl m-4">
            ㄹㅇㄹㄴ
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
