mod document;

use serde_json::Value;
use tauri::AppHandle;

#[tauri::command]
fn load_menu(app: AppHandle) -> Result<Value, String> {
    document::load_menu(&app)
}

#[tauri::command]
fn save_menu(app: AppHandle, menu: Value) -> Result<(), String> {
    document::save_menu(&app, menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_menu, save_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
