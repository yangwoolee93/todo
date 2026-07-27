import { app, BrowserWindow, ipcMain, Menu, screen, shell, Tray, nativeImage } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipcHandlers";
import { ensureNormalizedStore } from "./database/todoRepository";

const TITLE_BAR_HEIGHT = 44;
/** Windows 커스텀 타이틀바 오버레이 색 (라이트/다크) */
const TITLE_BAR_COLORS = {
  light: { color: "#f4f6f9", symbolColor: "#1e293b" },
  dark: { color: "#121212", symbolColor: "#ececec" },
} as const;

/** 메인 BrowserWindow 참조 (macOS activate 이벤트용) */
let mainWindow: BrowserWindow | null = null;

/** Windows 시스템 트레이 */
let tray: Tray | null = null;

/** 트레이「종료」 등 의도적 quit 일 때만 창 close 허용 */
let isQuitting = false;

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
 * OS별 BrowserWindow 옵션 (타이틀바·트래픽 라이트 등).
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

/** Windows 트레이 아이콘 경로 (.ico) */
function getWindowsTrayIconPath(): string {
  return join(__dirname, "../../build/icon_win.ico");
}

/** 트레이·메뉴에서 메인 창을 다시 연다. 없으면 새로 생성한다. */
function showMainWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

/** 트레이「종료」 등 — close 가로채기 없이 앱을 완전히 종료한다. */
function quitApp(): void {
  isQuitting = true;
  app.quit();
}

/**
 * Windows 전용 시스템 트레이.
 * X로 닫을 때 숨긴 뒤 트레이에서 다시 열거나 종료할 수 있다.
 */
function createWindowsTray(): void {
  if (process.platform !== "win32" || tray) {
    return;
  }

  const icon = nativeImage.createFromPath(getWindowsTrayIconPath());
  // .ico 로드 실패 시 PNG 폴백
  tray = new Tray(
    icon.isEmpty() ? nativeImage.createFromPath(join(__dirname, "../../build/icon_win.png")) : icon,
  );
  tray.setToolTip("Orbit");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Orbit 열기", click: () => showMainWindow() },
    { type: "separator" },
    { label: "종료", click: () => quitApp() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => showMainWindow());
}

/**
 * 메인 BrowserWindow를 생성하고 렌더러를 로드한다.
 */
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
    icon:
      process.platform === "win32"
        ? join(__dirname, "../../build/icon_win.png")
        : join(__dirname, "../../build/icon.png"),
  });

  const isDev = !app.isPackaged;
  // loadURL / loadFile 다음
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "bottom" });
    // mode: "undocked" | "detach" | "right" 등
  }

  // Windows: X 버튼은 종료가 아니라 트레이로 최소화(숨김)
  if (process.platform === "win32") {
    mainWindow.on("close", (event) => {
      if (isQuitting) {
        return;
      }
      event.preventDefault();
      mainWindow?.hide();
    });
  }

  // Windows는 hidden 타이틀바 + did-finish-load 후 show, 그 외는 ready-to-show
  if (process.platform === "win32") {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow?.show();
    });
  } else {
    mainWindow.on("ready-to-show", () => {
      mainWindow?.show();
    });
  }

  // 새 창/탭 대신 OS 기본 브라우저로 연다
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // dev: Vite URL / prod: 빌드된 index.html
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

/** 렌더러 테마에 맞춰 Windows 타이틀바 오버레이 색을 바꾼다. */
ipcMain.handle("window:setTitleBarOverlay", (_event, isDark: boolean) => {
  if (!mainWindow) return;
  const theme = isDark ? TITLE_BAR_COLORS.dark : TITLE_BAR_COLORS.light;
  mainWindow.setTitleBarOverlay({ ...theme, height: TITLE_BAR_HEIGHT });
});

/** Electron 앱 초기화 — IPC 등록 및 윈도우 생성 */
app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    const appIcon = nativeImage.createFromPath(join(__dirname, "../../build/icon.png"));
    app.dock.setIcon(appIcon);
  }
  ensureNormalizedStore();
  registerIpcHandlers();
  createWindow();
  createWindowsTray();

  // macOS: Dock 아이콘 클릭 시 창이 없으면 다시 생성
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * 모든 창이 닫혔을 때.
 * Mac·Windows(win32)는 트레이/Dock 백그라운드 유지를 위해 quit 하지 않는다.
 */
app.on("window-all-closed", () => {
  if (process.platform === "darwin" || process.platform === "win32") {
    return;
  }
  app.quit();
});

/** Alt+F4·트레이 종료 등 quit 직전 — close 이벤트에서 hide 하지 않도록 플래그 설정 */
app.on("before-quit", () => {
  isQuitting = true;
});
