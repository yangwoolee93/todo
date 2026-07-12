import type { TodoApi } from "../preload/index";

declare global {
  interface Window {
    /** Preload에서 노출하는 IPC API */
    api: TodoApi;
    /** Preload에서 노출하는 Electron 런타임 정보 */
    electron: {
      platform: NodeJS.Platform;
    };
  }
}

export {};
