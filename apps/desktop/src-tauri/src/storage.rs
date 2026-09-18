use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

use crate::models::TodoDatabase;

const STORE_FILE_NAME: &str = "todos.json";
const BACKUP_DIR_NAME: &str = "backups";
const MAX_BACKUPS: usize = 20;

pub fn get_store_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("앱 데이터 경로를 찾을 수 없습니다")
        .join(STORE_FILE_NAME)
}

fn get_backup_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    get_store_path(app)
        .parent()
        .map(|p| p.join(BACKUP_DIR_NAME))
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

/// 현재 저장된 파일을 `backups/` 아래에 타임스탬프로 복사해 둔다.
/// 불러오기처럼 기존 데이터를 통째로 바꾸는 작업 전에 안전망으로 호출한다.
/// 실패해도 원래 작업을 막지 않도록 에러는 무시한다(best-effort).
pub fn backup_store_file(app: &tauri::AppHandle) {
    let store_path = get_store_path(app);
    if !store_path.exists() {
        return;
    }
    let Some(backup_dir) = get_backup_dir(app) else {
        return;
    };
    if fs::create_dir_all(&backup_dir).is_err() {
        return;
    }

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let backup_path = backup_dir.join(format!("todos-{}.json", ts));
    let _ = fs::copy(&store_path, &backup_path);

    prune_old_backups(&backup_dir);
}

/// 오래된 백업을 정리해 최근 `MAX_BACKUPS`개만 남긴다.
fn prune_old_backups(backup_dir: &PathBuf) {
    let Ok(entries) = fs::read_dir(backup_dir) else {
        return;
    };

    let mut files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|ext| ext == "json"))
        .collect();

    if files.len() <= MAX_BACKUPS {
        return;
    }

    // 파일명이 `todos-{ms}.json` 형태라 이름 정렬 = 시간 정렬.
    files.sort();
    let remove_count = files.len() - MAX_BACKUPS;
    for path in files.into_iter().take(remove_count) {
        let _ = fs::remove_file(path);
    }
}
