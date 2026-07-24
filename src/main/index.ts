import { app, BrowserWindow, ipcMain, screen, shell, nativeImage } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipcHandlers";
import { ensureNormalizedStore } from "./database/todoRepository";

const TITLE_BAR_HEIGHT = 44;
const TITLE_BAR_COLORS = {
  light: { color: "#f4f6f9", symbolColor: "#1e293b" },
  dark: { color: "#121212", symbolColor: "#ececec" },
} as const;

/** 메인 BrowserWindow 참조 (macOS activate 이벤트용) */
let mainWindow: BrowserWindow | null = null;

/** UI 레이아웃이 깨지지 않는 최소 창 크기 */
const MIN_WINDOW_WIDTH = 480;
const MIN_WINDOW_HEIGHT = 720;

/** 값을 최소·최대 범위 안으로 제한한다. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 주 디스플레이 작업 영역 비율로 초기 창 크기·위치를 계산한다.
 * 울트라와이드(가로/세로 ≥ 2)는 너비 비율을 낮춰 과도하게 넓어지지 않게 한다.
 */
function getDefaultWindowBounds(): {
  width: number;
  height: number;
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
} {
  const { workArea } = screen.getPrimaryDisplay();
  const isUltrawide = workArea.width / workArea.height >= 2;
  const widthRatio = isUltrawide ? 0.16 : 0.22;
  const heightRatio = 0.7;

  const width = clamp(Math.round(workArea.width * widthRatio), MIN_WINDOW_WIDTH, workArea.width);
  const height = clamp(
    Math.round(workArea.height * heightRatio),
    MIN_WINDOW_HEIGHT,
    workArea.height,
  );

  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    maxWidth: workArea.width,
    maxHeight: workArea.height,
  };
}

/**
 * 메인 BrowserWindow를 생성하고 렌더러를 로드한다.
 */
function getPlatformWindowOptions(): Electron.BrowserWindowConstructorOptions {
  if (process.platform === "darwin") {
    return {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 12, y: 14 },
      title: "Orbit",
    };
  }
  if (process.platform === "win32") {
    return {
      title: "Orbit",
      titleBarStyle: "hidden",
      titleBarOverlay: {
        ...TITLE_BAR_COLORS.light,
        height: TITLE_BAR_HEIGHT,
      },
    };
  }

  return {};
}

function createWindow(): void {
  const { width, height, x, y, maxWidth, maxHeight } = getDefaultWindowBounds();

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    maxWidth,
    maxHeight,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f4f6f9",
    ...getPlatformWindowOptions(),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: join(__dirname, "../../build/icon_win.png"),
  });

  if (process.platform === "win32") {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow?.show();
    });
  } else {
    mainWindow.on("ready-to-show", () => {
      mainWindow?.show();
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

ipcMain.handle("window:setTitleBarOverlay", (_event, isDark: boolean) => {
  if (!mainWindow) return;
  const theme = isDark ? TITLE_BAR_COLORS.dark : TITLE_BAR_COLORS.light;
  mainWindow.setTitleBarOverlay({ ...theme, height: TITLE_BAR_HEIGHT });
});

/** Electron 앱 초기화 — IPC 등록 및 윈도우 생성 */
app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    const appIcon = nativeImage.createFromPath(join(__dirname, "../../build/icon_win.png"));
    app.dock.setIcon(appIcon);
  }
  ensureNormalizedStore();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/** 모든 윈도우가 닫히면 앱 종료 (macOS 제외) */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
