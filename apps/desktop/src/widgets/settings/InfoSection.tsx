import { useEffect, useState } from "react";
import { cn } from "@renderer/utils/cn";
import { Button, Modal, ModalTitle } from "@renderer/shared/ui";
import { APP_VERSION } from "@renderer/constants/appVersion";
import { OPEN_SOURCE_LIBS } from "@renderer/features/settings";
import { settingsInfoRowClass, settingsRowClass } from "./settingsRow";

export default function InfoSection() {
  const [storePath, setStorePath] = useState<string | null>(null);
  const [pathError, setPathError] = useState(false);
  const [openDirConfirm, setOpenDirConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.api.getStorePath().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setStorePath(res.data);
        return;
      }
      setPathError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openStoreDir = async () => {
    if (!storePath) return;
    const dir = storePath.replace(/[\\/][^\\/]+$/, "");
    if (!dir) return;
    setOpenDirConfirm(false);
    const { openPath } = await import("@tauri-apps/plugin-opener");
    await openPath(dir);
  };

  const openLibSite = async (url: string) => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className={settingsInfoRowClass}>
        <p className="text-xs text-fg-secondary">앱</p>
        <p className="mt-0.5 text-sm text-fg">Orbit</p>
      </div>
      <div className={settingsInfoRowClass}>
        <p className="text-xs text-fg-secondary">버전</p>
        <p className="mt-0.5 text-sm text-fg">{APP_VERSION} (프리릴리즈)</p>
      </div>
      <button
        type="button"
        className={cn(settingsRowClass, !storePath && "cursor-default")}
        disabled={!storePath}
        onClick={() => setOpenDirConfirm(true)}
      >
        <p className="text-xs text-fg-secondary">데이터 경로</p>
        <p className="mt-0.5 break-all text-sm text-fg">
          {pathError
            ? "경로를 불러오지 못했습니다"
            : (storePath ?? "불러오는 중…")}
        </p>
      </button>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="px-1 text-xs text-fg-secondary">사용한 오픈소스</p>
        <ul
          className={cn(
            "scrollbar grid min-h-0 min-w-0 flex-1 content-start gap-2",
            "grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]",
            "overflow-x-hidden overflow-y-auto",
          )}
        >
          {OPEN_SOURCE_LIBS.map((lib) => (
            <li key={lib.name} className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 flex-col items-center justify-center gap-3",
                  "rounded-(--radius-card) bg-surface px-1.5 py-2.5 border-2 border-transparent",
                  "hover:border-accent-soft hover:bg-muted",
                )}
                onClick={() => void openLibSite(lib.url)}
              >
                <lib.icon className="size-8" />
                <span className="w-full text-center text-sm font-semibold leading-tight text-fg">
                  {lib.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Modal
        open={openDirConfirm}
        onClose={() => setOpenDirConfirm(false)}
        label="데이터 폴더 열기"
      >
        <ModalTitle className="mb-2 text-base font-semibold text-fg">
          데이터 폴더 열기
        </ModalTitle>
        <p className="text-sm text-fg-secondary">
          데이터가 저장된 폴더를 엽니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenDirConfirm(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={() => void openStoreDir()}>
            열기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
