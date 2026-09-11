/// <reference types="vite/client" />

import type { AppApi } from "./api/index";

declare global {
  interface Window {
    api: AppApi;
    electron: {
      platform: string;
      setTitleBarOverlay: (isDark: boolean) => void;
    };
  }
}

export {};
