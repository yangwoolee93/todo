use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::models::{DataTransferMeta, MemoItem, TodoDatabase, TodoItem};
use crate::storage::{read_store, write_store};

// ─── JSON 내보내기 ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn export_json(app: AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title("JSON 백업 저장")
        .set_file_name(format!("todos-backup-{}.json", now_ms()))
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path_to_string(&path)?;
            let mut store = read_store(&app);
            store.last_exported_at = Some(now_ms());
            let json = serde_json::to_string_pretty(&store).map_err(|e| e.to_string())?;
            fs::write(&path_str, json).map_err(|e| e.to_string())?;
            write_store(&app, &store);
            Ok(Some(path_str))
        }
        None => Ok(None), // 취소
    }
}

// ─── JSON 불러오기 ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn import_json(app: AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title("JSON 백업 불러오기")
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path_to_string(&path)?;
            let raw = fs::read_to_string(&path_str).map_err(|e| e.to_string())?;

            let parsed: serde_json::Value =
                serde_json::from_str(&raw).map_err(|_| "유효하지 않은 JSON 형식입니다.".to_string())?;

            let todos: Vec<TodoItem> = parsed
                .get("todos")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .ok_or("todos 필드가 없거나 형식이 올바르지 않습니다.")?;

            let memos: Vec<MemoItem> = parsed
                .get("memos")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();

            let last_exported_at = parsed.get("last_exported_at").and_then(|v| v.as_i64());

            let new_store = TodoDatabase {
                todos,
                memos,
                last_exported_at,
                last_imported_at: Some(now_ms()),
            };
            write_store(&app, &new_store);

            Ok(Some(path_str))
        }
        None => Ok(None), // 취소
    }
}

#[tauri::command]
pub fn get_data_transfer_meta(app: AppHandle) -> DataTransferMeta {
    let store = read_store(&app);
    DataTransferMeta {
        last_exported_at: store.last_exported_at,
        last_imported_at: store.last_imported_at,
    }
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn path_to_string(path: &FilePath) -> Result<String, String> {
    match path {
        FilePath::Path(p) => p
            .to_str()
            .map(|s| s.to_string())
            .ok_or("경로를 문자열로 변환할 수 없습니다.".to_string()),
        FilePath::Url(u) => Ok(u.to_string()),
    }
}
