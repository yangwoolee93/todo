import {
  DataTransferModals,
  transferTimeLabel,
  useDataTransfer,
  useGoogleAuth,
} from "@renderer/features/settings";
import { Button, Modal, ModalTitle, GoogleGIcon } from "@renderer/shared/ui";
import { cn } from "@renderer/utils/cn";
import { settingsInfoRowClass, settingsRowClass } from "./settingsRow";

export default function DataSection() {
  const {
    meta,
    importModeOpen,
    setImportModeOpen,
    importConfirmOpen,
    setImportConfirmOpen,
    result,
    setResult,
    handleExportJson,
    handleImportConfirm,
    handleImportMerge,
  } = useDataTransfer();
  const { status, ready, busy, logoutOpen, setLogoutOpen, login, logout, sync } =
    useGoogleAuth(setResult);

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-fg-secondary">Google Drive</p>
      {!ready ? (
        <div
          className="h-10 w-full animate-pulse rounded-(--radius-card) bg-surface"
          aria-hidden
        />
      ) : status.connected ? (
        <>
          <div
            className={cn(
              settingsInfoRowClass,
              "flex items-center gap-3 py-2.5",
            )}
          >
            <GoogleGIcon />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {status.email ?? "Google 계정"}
            </span>
            <button
              type="button"
              className="shrink-0 text-sm text-fg-secondary hover:text-fg"
              disabled={busy}
              onClick={() => setLogoutOpen(true)}
            >
              로그아웃
            </button>
          </div>
          <button
            type="button"
            className={cn(settingsRowClass, busy && "cursor-wait opacity-[0.38]")}
            disabled={busy}
            onClick={() => void sync()}
          >
            <span className="block text-sm text-fg">데이터 동기화</span>
            <span className="mt-0.5 block text-xs text-fg-secondary">
              마지막 {transferTimeLabel(status.last_synced_at)}
            </span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-center gap-3",
            "rounded-(--radius-btn) border text-sm font-medium",
            "bg-white text-[#1F1F1F] border-[#747775]",
            "dark:bg-[#131314] dark:text-[#E3E3E3] dark:border-[#8E918F]",
            "hover:bg-[#F8F8F8] dark:hover:bg-[#1F1F1F]",
            busy && "cursor-wait opacity-[0.38]",
          )}
          disabled={busy}
          onClick={() => void login()}
        >
          <GoogleGIcon />
          Google 계정으로 로그인
        </button>
      )}
      <p className="px-1 text-xs text-fg-secondary">
        {!ready
          ? "\u00a0"
          : busy
            ? status.connected
              ? "드라이브와 동기화 중…"
              : "브라우저에서 로그인 중…"
            : !status.configured
              ? "apps/desktop/.env 에 클라이언트 값을 넣고 다시 실행하세요."
              : "동기화하면 Drive에 Orbit 폴더를 만들고, 그 안에 데이터 파일·안내 파일·백업 1개를 둡니다. 이 폴더를 지우면 동기화가 끊깁니다."}
      </p>

      <p className="px-1 pt-3 text-xs text-fg-secondary">이 기기 파일</p>
      <button
        type="button"
        className={settingsRowClass}
        onClick={() => void handleExportJson()}
      >
        <span className="block text-sm text-fg">JSON 내보내기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_exported_at)}
        </span>
      </button>
      <button
        type="button"
        className={settingsRowClass}
        onClick={() => setImportModeOpen(true)}
      >
        <span className="block text-sm text-fg">JSON 불러오기</span>
        <span className="mt-0.5 block text-xs text-fg-secondary">
          마지막 {transferTimeLabel(meta.last_imported_at)}
        </span>
      </button>
      <p className="px-1 pt-1 text-xs text-fg-secondary">
        병합은 겹치는 항목만 최신 것으로 정리하고, 덮어쓰기는 현재 데이터를 파일
        내용으로 완전히 바꿉니다. 두 방식 모두 불러오기 전 상태를 자동으로
        백업해 둡니다.
      </p>
      <DataTransferModals
        importModeOpen={importModeOpen}
        setImportModeOpen={setImportModeOpen}
        importConfirmOpen={importConfirmOpen}
        setImportConfirmOpen={setImportConfirmOpen}
        result={result}
        setResult={setResult}
        handleImportConfirm={handleImportConfirm}
        handleImportMerge={handleImportMerge}
      />
      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        label="로그아웃"
      >
        <ModalTitle className="mb-2 text-base font-semibold text-fg">
          로그아웃
        </ModalTitle>
        <p className="text-sm text-fg-secondary">
          이 기기에서 로그아웃할까요? 할 일 데이터는 그대로 둡니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </Modal>
    </div>
  );
}
