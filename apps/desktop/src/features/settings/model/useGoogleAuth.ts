import { useCallback, useEffect, useState } from "react";
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
};

export function useGoogleAuth(setResult: (result: TransferResult | null) => void) {
  const activeDate = useUIStore((s) => s.activeDate);
  const loadTodosByDate = useTodoStore((s) => s.loadTodosByDate);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const [status, setStatus] = useState<GoogleAuthStatus>(EMPTY);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await window.api.getGoogleAuthStatus();
    if (res.success && res.data) {
      setStatus({
        ...res.data,
        email: res.data.email ?? null,
        last_synced_at: res.data.last_synced_at ?? null,
      });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = async () => {
    if (busy) return;
    setBusy(true);
    const res = await window.api.googleLogin();
    setBusy(false);
    if (res.success && res.data) {
      setStatus({
        ...res.data,
        email: res.data.email ?? null,
        last_synced_at: res.data.last_synced_at ?? null,
      });
      setResult({ title: "구글 연결 완료", message: res.data.email ?? "연결되었습니다." });
      return;
    }
    if (res.error) {
      setResult({ title: "구글 로그인 실패", message: res.error, isError: true });
    }
  };

  const logout = async () => {
    setLogoutOpen(false);
    if (busy) return;
    setBusy(true);
    const res = await window.api.googleLogout();
    setBusy(false);
    if (res.success && res.data) {
      setStatus({
        ...res.data,
        email: res.data.email ?? null,
        last_synced_at: res.data.last_synced_at ?? null,
      });
      setResult({ title: "로그아웃", message: "이 기기에서 로그아웃했습니다." });
      return;
    }
    if (res.error) {
      setResult({ title: "로그아웃 실패", message: res.error, isError: true });
    }
  };

  const sync = async () => {
    if (busy) return;
    setBusy(true);
    const res = await window.api.googleSync();
    setBusy(false);
    if (res.success && res.data) {
      const data = res.data;
      setStatus((prev) => ({ ...prev, last_synced_at: data.last_synced_at }));
      setResult({
        title: "동기화 완료",
        message: `추가 ${data.added} · 갱신 ${data.updated} · 삭제 ${data.deleted}`,
      });
      await Promise.all([loadTodosByDate(activeDate), loadMemos()]);
      return;
    }
    if (res.error) {
      setResult({ title: "동기화 실패", message: res.error, isError: true });
    }
  };

  return { status, ready, busy, logoutOpen, setLogoutOpen, login, logout, sync };
}
