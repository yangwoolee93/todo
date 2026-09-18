import { useCallback, useEffect, useState } from "react";
import type { GoogleAuthStatus } from "@shared/types/google";
import type { TransferResult } from "./useDataTransfer";

const EMPTY: GoogleAuthStatus = { configured: false, connected: false, email: null };

export function useGoogleAuth(setResult: (result: TransferResult | null) => void) {
  const [status, setStatus] = useState<GoogleAuthStatus>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await window.api.getGoogleAuthStatus();
    if (res.success && res.data) {
      setStatus({ ...res.data, email: res.data.email ?? null });
    }
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
      setStatus({ ...res.data, email: res.data.email ?? null });
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
      setStatus({ ...res.data, email: res.data.email ?? null });
      setResult({ title: "구글 연결 해제", message: "이 기기에서 연결을 해제했습니다." });
      return;
    }
    if (res.error) {
      setResult({ title: "연결 해제 실패", message: res.error, isError: true });
    }
  };

  return { status, busy, logoutOpen, setLogoutOpen, login, logout };
}
