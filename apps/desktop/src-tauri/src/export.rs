use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::memo::{ensure_memo_schema, migrate_ids, migrate_memo_json};
use crate::merge::merge_database;
use crate::models::{DataTransferMeta, MemoCategory, MemoItem, TodoDatabase, TodoItem};
use crate::storage::{backup_store_file, read_store, write_store};

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

/// 백업 파일 JSON을 최신 스키마(문자열 id·`updated_at`)로 맞춰 읽는다.
/// 예전 버전(숫자 id)에서 내보낸 파일도 그대로 불러올 수 있게 마이그레이션을 거친다.
fn parse_incoming_database(raw: &str) -> Result<TodoDatabase, String> {
    let mut parsed: serde_json::Value =
        serde_json::from_str(raw).map_err(|_| "유효하지 않은 JSON 형식입니다.".to_string())?;

    migrate_memo_json(&mut parsed);
    migrate_ids(&mut parsed);

    let todos: Vec<TodoItem> = parsed
        .get("todos")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .ok_or("todos 필드가 없거나 형식이 올바르지 않습니다.")?;

    let memos: Vec<MemoItem> = parsed
        .get("memos")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let memo_categories: Vec<MemoCategory> = parsed
        .get("memo_categories")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let last_exported_at = parsed.get("last_exported_at").and_then(|v| v.as_i64());

    Ok(TodoDatabase {
        todos,
        memos,
        memo_categories,
        last_exported_at,
        last_imported_at: None,
    })
}

/// 불러오기 — 현재 데이터를 파일 내용으로 완전히 바꾼다(되돌릴 수 없음, 대신 백업은 남긴다).
#[tauri::command]
pub async fn import_json(app: AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title("JSON 백업 불러오기")
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let Some(path) = file_path else {
        return Ok(None); // 취소
    };

    let path_str = path_to_string(&path)?;
    let raw = fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
    let incoming = parse_incoming_database(&raw)?;

    // 기존 데이터를 통째로 바꾸기 전에 스냅샷을 남겨 되돌릴 수 있게 한다.
    backup_store_file(&app);

    let mut new_store = incoming;
    new_store.last_imported_at = Some(now_ms());
    ensure_memo_schema(&mut new_store);
    write_store(&app, &new_store);

    Ok(Some(path_str))
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportMergeResult {
    pub file_path: String,
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
}

/// 병합 — 현재 데이터를 유지한 채 파일 내용을 더한다. 같은 항목은
/// `updated_at`이 더 큰 쪽만 남으므로, 서로 다른 기기의 데이터를 안전하게
/// 합칠 수 있다.
#[tauri::command]
pub async fn import_json_merge(app: AppHandle) -> Result<Option<ImportMergeResult>, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title("JSON 백업과 병합")
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let Some(path) = file_path else {
        return Ok(None); // 취소
    };

    let path_str = path_to_string(&path)?;
    let raw = fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
    let incoming = parse_incoming_database(&raw)?;

    // 병합도 로컬 데이터를 바꾸는 작업이라 되돌릴 수 있게 스냅샷을 남긴다.
    backup_store_file(&app);

    let local = read_store(&app);
    let (mut merged, summary) = merge_database(local, incoming);
    merged.last_imported_at = Some(now_ms());
    ensure_memo_schema(&mut merged);
    write_store(&app, &merged);

    Ok(Some(ImportMergeResult {
        file_path: path_str,
        added: summary.added,
        updated: summary.updated,
        deleted: summary.deleted,
    }))
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
