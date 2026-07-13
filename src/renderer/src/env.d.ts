/// <reference types="vite/client" />

import type { TodoApi } from "../../preload/index";

declare global {
  interface Window {
    api: TodoApi;
    electron: {
      platform: NodeJS.Platform;
      setTitleBarOverlay: (isDark: boolean) => void;
    };
  }
}

export {};
