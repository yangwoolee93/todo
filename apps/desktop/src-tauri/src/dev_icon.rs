use tauri::{image::Image, AppHandle, Manager, Runtime, WebviewWindow};

#[cfg(all(debug_assertions, target_os = "macos"))]
const DEV_PNG: &[u8] = include_bytes!("../icons/dev/mac.png");

#[cfg(all(debug_assertions, windows))]
const DEV_PNG: &[u8] = include_bytes!("../icons/dev/win.png");

#[cfg(all(debug_assertions, any(target_os = "macos", windows)))]
pub fn load() -> Option<Image<'static>> {
    Image::from_bytes(DEV_PNG).ok()
}

#[cfg(not(all(debug_assertions, any(target_os = "macos", windows))))]
pub fn load() -> Option<Image<'static>> {
    None
}

pub fn apply_to_window<R: Runtime>(window: &WebviewWindow<R>) {
    if let Some(icon) = load() {
        let _ = window.set_icon(icon);
    }
}

/// 맥 Dock은 창 아이콘과 별도라 디버그에서만 AppKit으로 덮는다.
#[cfg(all(debug_assertions, target_os = "macos"))]
pub fn apply_to_dock() {
    use objc2::{AnyThread, MainThreadMarker};
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };

    unsafe {
        let data = NSData::with_bytes(DEV_PNG);
        let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) else {
            return;
        };
        NSApplication::sharedApplication(mtm).setApplicationIconImage(Some(&image));
    }
}

#[cfg(not(all(debug_assertions, target_os = "macos")))]
pub fn apply_to_dock() {}

pub fn apply_all<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        apply_to_window(&window);
    }
    apply_to_dock();
}
