mod dev_icon;
mod document;

use serde_json::Value;
use tauri::{webview::PageLoadEvent, AppHandle, Manager};

#[tauri::command]
fn load_menu(app: AppHandle) -> Result<Value, String> {
    document::load_menu(&app)
}

#[tauri::command]
fn save_menu(app: AppHandle, menu: Value) -> Result<(), String> {
    document::save_menu(&app, menu)
}

#[tauri::command]
fn load_memos(app: AppHandle) -> Result<Value, String> {
    document::load_memos(&app)
}

#[tauri::command]
fn save_memos(app: AppHandle, memos: Value) -> Result<(), String> {
    document::save_memos(&app, memos)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_menu, save_menu, load_memos, save_memos
        ])
        .setup(|app| {
            dev_icon::apply_all(app.handle());
            Ok(())
        })
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                dev_icon::apply_all(webview.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
