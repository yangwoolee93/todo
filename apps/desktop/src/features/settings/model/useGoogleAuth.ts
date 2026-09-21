import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { GoogleAuthStatus } from "@shared/types/google";
import { useMemoStore } from "@renderer/features/memo/model/useMemoStore";
import { useTodoStore } from "@renderer/features/todo/model/useTodoStore";
import { useUIStore } from "@renderer/stores/useUIStore";
import type { TransferResult } from "./useDataTransfer";

const EMPTY: GoogleAuthStatus = {
  configured: false,
  connected: false,
  email: null,
  last_synced_at: null,
  logging_in: false,
  syncing: false,
  drive_granted: true,
};

function fromApi(data: GoogleAuthStatus): GoogleAuthStatus {
  return {
    configured: data.configured,
    connected: data.connected,
    email: data.email ?? null,
    last_synced_at: data.last_synced_at ?? null,
    logging_in: !!data.logging_in,
    syncing: !!data.syncing,
    drive_granted: data.drive_granted !== false,
  };
}

export function useGoogleAuth(setResult: (result: TransferResult | null) => void) {
  const activeDate = useUIStore((s) => s.activeDate);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const [status, setStatus] = useState<GoogleAuthStatus>(EMPTY);
  const [ready, setReady] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await window.api.getGoogleAuthStatus();
    if (res.success && res.data) {
      setStatus(fromApi(res.data));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<GoogleAuthStatus>("google-auth", (event) => {
      setStatus(fromApi(event.payload));
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const pending = status.logging_in || status.syncing;

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => {
      void load();
    }, 400);
    return () => window.clearInterval(id);
  }, [pending, load]);

  const login = async () => {
    if (status.logging_in || status.syncing) return;
    setStatus((prev) => ({ ...prev, logging_in: true }));
    const res = await window.api.googleLogin();
    if (res.success && res.data) {
      const next = fromApi(res.data);
      setStatus(next);
      if (!next.drive_granted) {
        setResult({
          title: "Drive 권한이 필요합니다",
          message: "동기화하려면 Drive 권한을 허용해 주세요.",
          isError: true,
        });
        return;
      }
      setResult({ title: "구글 연결 완료", message: next.email ?? "연결되었습니다." });
      return;
    }
    await load();
    const err = res.error ?? "";
    if (err.includes("취소")) return;
    if (err) {
      setResult({ title: "구글 로그인 실패", message: err, isError: true });
    }
  };

  const cancelLogin = async () => {
    if (!status.logging_in) return;
    await window.api.googleCancelLogin();
  };

  const logout = async () => {
    setLogoutOpen(false);
    if (status.logging_in || status.syncing) return;
    const res = await window.api.googleLogout();
    if (res.success && res.data) {
      setStatus(fromApi(res.data));
      setResult({ title: "로그아웃", message: "이 기기에서 로그아웃했습니다." });
      return;
    }
    if (res.error) {
      setResult({ title: "로그아웃 실패", message: res.error, isError: true });
    }
  };

  const sync = async () => {
    if (status.logging_in || status.syncing || !status.drive_granted) return;
    setStatus((prev) => ({ ...prev, syncing: true }));
    const res = await window.api.googleSync();
    if (res.success && res.data) {
      const data = res.data;
      setStatus((prev) => ({
        ...prev,
        syncing: false,
        last_synced_at: data.last_synced_at,
      }));
      setResult({
        title: "동기화 완료",
        message: `추가 ${data.added} · 갱신 ${data.updated} · 삭제 ${data.deleted}`,
      });
      await Promise.all([loadTodosByDate(activeDate), loadMemos()]);
      return;
    }
    await load();
    if (res.error) {
      setResult({ title: "동기화 실패", message: res.error, isError: true });
    }
  };

  return {
    status,
    ready,
    loggingIn: status.logging_in,
    syncing: status.syncing,
    logoutOpen,
    setLogoutOpen,
    login,
    cancelLogin,
    logout,
    sync,
  };
}
