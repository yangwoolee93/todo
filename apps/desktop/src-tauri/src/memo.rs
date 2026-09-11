use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::models::MemoItem;
use crate::storage::{mutate_store, read_store};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn is_memo_kind(kind: &str) -> bool {
    kind == "routine" || kind == "planned"
}

fn next_memo_id(memos: &[MemoItem]) -> i64 {
    memos.iter().map(|m| m.id).max().unwrap_or(0) + 1
}

fn next_sort_order(memos: &[MemoItem], kind: &str) -> i64 {
    memos
        .iter()
        .filter(|m| m.kind == kind)
        .map(|m| m.sort_order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn sort_memos(items: Vec<MemoItem>) -> Vec<MemoItem> {
    let mut sorted = items;
    sorted.sort_by(|a, b| {
        a.sort_order
            .cmp(&b.sort_order)
            .then(a.created_at.cmp(&b.created_at))
    });
    sorted
}

// ─── Tauri 커맨드 ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_memos(app: AppHandle) -> Result<Vec<MemoItem>, String> {
    let store = read_store(&app);
    Ok(sort_memos(store.memos))
}

#[tauri::command]
pub fn create_memo(
    app: AppHandle,
    kind: String,
    title: String,
    note: String,
) -> Result<MemoItem, String> {
    let title = title.trim().to_string();
    if title.is_empty() || !is_memo_kind(&kind) {
        return Err("유효하지 않은 입력입니다".into());
    }

    let note = if kind == "planned" {
        note.trim().to_string()
    } else {
        String::new()
    };

    let mut created: Option<MemoItem> = None;

    mutate_store(&app, |store| {
        let id = next_memo_id(&store.memos);
        let sort_order = next_sort_order(&store.memos, &kind);
        let item = MemoItem {
            id,
            kind: kind.clone(),
            title: title.clone(),
            note: note.clone(),
            created_at: now_ms(),
            sort_order,
        };
        store.memos.push(item.clone());
        created = Some(item);
    });

    created.ok_or_else(|| "메모 생성 실패".into())
}

#[tauri::command]
pub fn update_memo(
    app: AppHandle,
    id: i64,
    title: String,
    note: String,
) -> Result<bool, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("제목이 비어있습니다".into());
    }

    let mut changed = false;
    mutate_store(&app, |store| {
        if let Some(item) = store.memos.iter_mut().find(|m| m.id == id) {
            item.title = title.clone();
            item.note = if item.kind == "planned" {
                note.trim().to_string()
            } else {
                String::new()
            };
            changed = true;
        }
    });

    Ok(changed)
}

#[tauri::command]
pub fn delete_memo(app: AppHandle, id: i64) -> Result<bool, String> {
    let mut changed = false;
    mutate_store(&app, |store| {
        let before = store.memos.len();
        store.memos.retain(|m| m.id != id);
        changed = store.memos.len() < before;
    });
    Ok(changed)
}
