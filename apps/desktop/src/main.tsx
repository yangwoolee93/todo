import React from "react";
import ReactDOM from "react-dom/client";
import { api } from "./api/index";
import { App } from "./App";
import "./styles/index.css";

// Tauri invoke 기반 API를 window.api로 노출 (기존 store 코드 호환)
window.api = api;

// Tauri에서는 titleBarOverlay IPC가 없으므로 noop으로 처리
window.electron = {
  platform: navigator.userAgent.includes("Windows") ? "win32" : "darwin",
  setTitleBarOverlay: () => {},
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
