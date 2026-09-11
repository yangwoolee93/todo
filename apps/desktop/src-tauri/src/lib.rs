mod export;
mod memo;
mod models;
mod storage;
mod todo;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
