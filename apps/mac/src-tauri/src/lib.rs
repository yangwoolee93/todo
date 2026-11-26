mod dev_icon;
mod document;
mod transfer;

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

#[tauri::command]
fn load_todos(app: AppHandle) -> Result<Value, String> {
    document::load_todos(&app)
}

#[tauri::command]
fn load_todo_statuses(app: AppHandle) -> Result<Value, String> {
    document::load_todo_statuses(&app)
}

#[tauri::command]
fn load_timeline_views(app: AppHandle) -> Result<Value, String> {
    document::load_timeline_views(&app)
}

#[tauri::command]
fn save_todos(app: AppHandle, todos: Value, statuses: Value, views: Value) -> Result<(), String> {
    document::save_todos(&app, todos, statuses, views)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_menu,
            save_menu,
            load_memos,
            save_memos,
            load_todos,
            load_todo_statuses,
            load_timeline_views,
            save_todos,
            transfer::export_document,
            transfer::import_document,
            transfer::transfer_times
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
