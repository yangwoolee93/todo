mod export;
mod memo;
mod models;
mod storage;
mod todo;
mod tray;

use tauri::{Manager, WindowEvent};

const MIN_WIDTH: u32 = 480;
const MIN_HEIGHT: u32 = 720;

/// 레거시 Electron과 동일한 비율로 초기 창 크기를 계산한다.
/// - 울트라와이드(가로/세로 ≥ 2): 너비 비율 0.16
/// - 일반: 너비 비율 0.22, 세로 비율 0.70
fn calc_window_size(monitor: &tauri::Monitor) -> (u32, u32) {
    let size = monitor.size();
    let w = size.width;
    let h = size.height;

    let is_ultrawide = w as f64 / h as f64 >= 2.0;
    let width_ratio = if is_ultrawide { 0.16_f64 } else { 0.22_f64 };
    let height_ratio = 0.70_f64;

    let width = ((w as f64 * width_ratio).round() as u32).clamp(MIN_WIDTH, w);
    let height = ((h as f64 * height_ratio).round() as u32).clamp(MIN_HEIGHT, h);

    (width, height)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tray::setup_tray(&app.handle())?;

            // 주 모니터 해상도 기반으로 초기 창 크기 동적 조정
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let (width, height) = calc_window_size(&monitor);
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }));
                    let _ = window.center();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // X 버튼 → 트레이로 숨기기 (종료 아님)
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Todo
            todo::get_todos_by_date,
            todo::get_month_summary,
            todo::create_todo,
            todo::create_todo_range,
            todo::create_todo_month,
            todo::toggle_completion,
            todo::set_todo_status,
            todo::delete_todo,
            todo::update_todo_content,
            todo::reorder_todo,
            todo::get_store_path_str,
            // Memo
            memo::list_memos,
            memo::create_memo,
            memo::update_memo,
            memo::delete_memo,
            // Export / Import
            export::export_json,
            export::import_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
