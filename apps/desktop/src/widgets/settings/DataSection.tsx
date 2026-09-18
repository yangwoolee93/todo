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
  const { status, busy, logoutOpen, setLogoutOpen, login, logout } =
    useGoogleAuth(setResult);

  return (
    <div className="flex flex-col gap-2">
      {status.connected ? (
        <>
          <div className={settingsInfoRowClass}>
            <span className="block text-sm text-fg">구글 연결됨</span>
            <span className="mt-0.5 block text-xs text-fg-secondary">
              {status.email ?? "연결되었습니다."}
            </span>
          </div>
          <button
            type="button"
            className={settingsRowClass}
            disabled={busy}
            onClick={() => setLogoutOpen(true)}
          >
            <span className="block text-sm text-fg">연결 해제</span>
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
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
          {busy ? (
            <p className="px-1 text-xs text-fg-secondary">브라우저에서 로그인 중…</p>
          ) : !status.configured ? (
            <p className="px-1 text-xs text-fg-secondary">
              apps/desktop/.env 에 클라이언트 값을 넣고 다시 실행하세요.
            </p>
          ) : null}
        </div>
      )}

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
      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} label="구글 연결 해제">
        <ModalTitle className="mb-2 text-base font-semibold text-fg">
          구글 연결 해제
        </ModalTitle>
        <p className="text-sm text-fg-secondary">
          이 기기에서 구글 연결을 해제할까요? 할 일 데이터는 그대로 둡니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={() => void logout()}>
            해제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
