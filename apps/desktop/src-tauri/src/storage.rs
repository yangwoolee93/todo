use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use crate::models::TodoDatabase;

const STORE_FILE_NAME: &str = "todos.json";

pub fn get_store_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("앱 데이터 경로를 찾을 수 없습니다")
        .join(STORE_FILE_NAME)
}

pub fn read_store(app: &tauri::AppHandle) -> TodoDatabase {
    let path = get_store_path(app);

    let mut store = if !path.exists() {
        TodoDatabase::default()
    } else {
        match fs::read_to_string(&path) {
            Ok(raw) => crate::memo::parse_database(&raw).unwrap_or_default(),
            Err(_) => TodoDatabase::default(),
        }
    };

    if crate::memo::ensure_memo_schema(&mut store) {
        write_store(app, &store);
    }

    store
}

pub fn write_store(app: &tauri::AppHandle, store: &TodoDatabase) {
    let path = get_store_path(app);

    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }

    let json = serde_json::to_string_pretty(store).expect("직렬화 실패");
    let _ = fs::write(&path, json);
}

pub fn mutate_store<F>(app: &tauri::AppHandle, mutator: F) -> TodoDatabase
where
    F: FnOnce(&mut TodoDatabase),
{
    let mut store = read_store(app);
    mutator(&mut store);
    write_store(app, &store);
    store
}
