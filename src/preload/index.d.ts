import type { TodoApi } from '../preload/index'

declare global {
  interface Window {
    /** Preload에서 노출하는 IPC API */
    api: TodoApi
  }
}

export {}
