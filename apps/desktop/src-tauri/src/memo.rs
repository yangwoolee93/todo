use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::models::{MemoCategory, MemoItem, TodoDatabase};
use crate::storage::{mutate_store, read_store};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn next_memo_id(memos: &[MemoItem]) -> i64 {
    memos.iter().map(|m| m.id).max().unwrap_or(0) + 1
}

fn next_category_id(categories: &[MemoCategory]) -> i64 {
    categories.iter().map(|c| c.id).max().unwrap_or(0) + 1
}

fn next_memo_sort_order(memos: &[MemoItem], category_id: i64) -> i64 {
    memos
        .iter()
        .filter(|m| m.category_id == category_id)
        .map(|m| m.sort_order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn next_category_sort_order(categories: &[MemoCategory]) -> i64 {
    categories
        .iter()
        .map(|c| c.sort_order)
        .max()
        .unwrap_or(-1)
        + 1
}

const MEMO_COLORS: [&str; 8] = [
    "teal", "blue", "violet", "rose", "amber", "green", "orange", "slate",
];

fn is_memo_color(color: &str) -> bool {
    MEMO_COLORS.contains(&color)
}

fn default_color_for_name(name: &str, index: usize) -> &'static str {
    match name {
        "루틴" => "teal",
        "예정" => "amber",
        _ => MEMO_COLORS[index % MEMO_COLORS.len()],
    }
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

fn sort_categories(items: Vec<MemoCategory>) -> Vec<MemoCategory> {
    let mut sorted = items;
    sorted.sort_by_key(|c| c.sort_order);
    sorted
}

fn default_memo_categories() -> Vec<MemoCategory> {
    vec![
        MemoCategory {
            id: 1,
            name: "루틴".into(),
            sort_order: 0,
            color: "teal".into(),
        },
        MemoCategory {
            id: 2,
            name: "예정".into(),
            sort_order: 1,
            color: "amber".into(),
        },
    ]
}

fn category_id_for_kind(categories: &[serde_json::Value], kind: &str) -> i64 {
    let name = if kind == "planned" { "예정" } else { "루틴" };
    categories
        .iter()
        .find_map(|category| {
            if category.get("name").and_then(|v| v.as_str()) == Some(name) {
                category.get("id").and_then(|v| v.as_i64())
            } else {
                None
            }
        })
        .or_else(|| {
            categories
                .first()
                .and_then(|category| category.get("id").and_then(|v| v.as_i64()))
        })
        .unwrap_or(1)
}

/// 옛 `kind` 필드를 `category_id`로 바꾸고, 기본 분류를 채운다.
pub fn migrate_memo_json(value: &mut serde_json::Value) {
    let mut categories = value
        .get("memo_categories")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if categories.is_empty() {
        categories = default_memo_categories()
            .into_iter()
            .filter_map(|c| serde_json::to_value(c).ok())
            .collect();
        value["memo_categories"] = serde_json::Value::Array(categories.clone());
    }

    let Some(memos) = value.get_mut("memos").and_then(|v| v.as_array_mut()) else {
        return;
    };

    for memo in memos {
        let Some(obj) = memo.as_object_mut() else {
            continue;
        };
        if obj.get("category_id").and_then(|v| v.as_i64()).is_some() {
            obj.remove("kind");
            continue;
        }
        let kind = obj
            .get("kind")
            .and_then(|v| v.as_str())
            .unwrap_or("routine")
            .to_string();
        obj.insert(
            "category_id".into(),
            serde_json::json!(category_id_for_kind(&categories, &kind)),
        );
        obj.remove("kind");
    }
}

pub fn parse_database(raw: &str) -> Result<TodoDatabase, String> {
    let mut value: serde_json::Value =
        serde_json::from_str(raw).map_err(|e| e.to_string())?;
    migrate_memo_json(&mut value);
    serde_json::from_value(value).map_err(|e| e.to_string())
}

/// 분류가 없으면 루틴/예정을 넣고, 없는 분류를 가리키는 메모는 첫 분류로 옮긴다.
pub fn ensure_memo_schema(store: &mut TodoDatabase) -> bool {
    let mut changed = false;

    if store.memo_categories.is_empty() {
        store.memo_categories = default_memo_categories();
        changed = true;
    }

    store.memo_categories.sort_by_key(|c| c.sort_order);
    let fallback = store.memo_categories[0].id;
    let valid: HashSet<i64> = store.memo_categories.iter().map(|c| c.id).collect();

    for (index, category) in store.memo_categories.iter_mut().enumerate() {
        if !is_memo_color(&category.color) {
            let name = category.name.clone();
            category.color = default_color_for_name(&name, index).to_string();
            changed = true;
        }
    }

    for memo in &mut store.memos {
        if !valid.contains(&memo.category_id) {
            memo.category_id = fallback;
            changed = true;
        }
    }

    changed
}

fn category_exists(store: &TodoDatabase, category_id: i64) -> bool {
    store.memo_categories.iter().any(|c| c.id == category_id)
}

fn normalize_name(name: &str) -> Result<String, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("이름이 비어있습니다".into());
    }
    Ok(name)
}

// ─── Tauri 커맨드 ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_memos(app: AppHandle) -> Result<Vec<MemoItem>, String> {
    let store = read_store(&app);
    Ok(sort_memos(store.memos))
}

#[tauri::command]
pub fn list_memo_categories(app: AppHandle) -> Result<Vec<MemoCategory>, String> {
    let store = read_store(&app);
    Ok(sort_categories(store.memo_categories))
}

#[tauri::command]
pub fn create_memo(
    app: AppHandle,
    category_id: i64,
    title: String,
    note: String,
) -> Result<MemoItem, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("유효하지 않은 입력입니다".into());
    }
    let note = note.trim().to_string();

    let mut created: Option<MemoItem> = None;

    mutate_store(&app, |store| {
        if !category_exists(store, category_id) {
            return;
        }
        let id = next_memo_id(&store.memos);
        let sort_order = next_memo_sort_order(&store.memos, category_id);
        let item = MemoItem {
            id,
            category_id,
            title: title.clone(),
            note: note.clone(),
            created_at: now_ms(),
            sort_order,
        };
        store.memos.push(item.clone());
        created = Some(item);
    });

    created.ok_or_else(|| "유효하지 않은 분류입니다".into())
}

#[tauri::command]
pub fn update_memo(
    app: AppHandle,
    id: i64,
    title: String,
    note: String,
    category_id: i64,
) -> Result<bool, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("제목이 비어있습니다".into());
    }
    let note = note.trim().to_string();

    let mut changed = false;
    mutate_store(&app, |store| {
        if !category_exists(store, category_id) {
            return;
        }
        let moving = store
            .memos
            .iter()
            .any(|m| m.id == id && m.category_id != category_id);
        let next_order = if moving {
            Some(next_memo_sort_order(&store.memos, category_id))
        } else {
            None
        };
        if let Some(item) = store.memos.iter_mut().find(|m| m.id == id) {
            if let Some(order) = next_order {
                item.sort_order = order;
            }
            item.title = title.clone();
            item.note = note.clone();
            item.category_id = category_id;
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

#[tauri::command]
pub fn create_memo_category(
    app: AppHandle,
    name: String,
    color: String,
) -> Result<MemoCategory, String> {
    let name = normalize_name(&name)?;
    if !is_memo_color(&color) {
        return Err("유효하지 않은 색입니다".into());
    }
    let mut created: Option<MemoCategory> = None;

    mutate_store(&app, |store| {
        if store
            .memo_categories
            .iter()
            .any(|c| c.name == name)
        {
            return;
        }
        let category = MemoCategory {
            id: next_category_id(&store.memo_categories),
            name: name.clone(),
            sort_order: next_category_sort_order(&store.memo_categories),
            color: color.clone(),
        };
        store.memo_categories.push(category.clone());
        created = Some(category);
    });

    created.ok_or_else(|| "이미 있는 이름입니다".into())
}

#[tauri::command]
pub fn update_memo_category(
    app: AppHandle,
    id: i64,
    name: String,
    color: String,
) -> Result<bool, String> {
    let name = normalize_name(&name)?;
    if !is_memo_color(&color) {
        return Err("유효하지 않은 색입니다".into());
    }
    let mut changed = false;
    let mut duplicate = false;

    mutate_store(&app, |store| {
        if store
            .memo_categories
            .iter()
            .any(|c| c.id != id && c.name == name)
        {
            duplicate = true;
            return;
        }
        if let Some(category) = store.memo_categories.iter_mut().find(|c| c.id == id) {
            category.name = name.clone();
            category.color = color.clone();
            changed = true;
        }
    });

    if duplicate {
        return Err("이미 있는 이름입니다".into());
    }
    Ok(changed)
}

#[tauri::command]
pub fn delete_memo_category(app: AppHandle, id: i64) -> Result<bool, String> {
    let mut changed = false;
    let mut last_one = false;

    mutate_store(&app, |store| {
        if store.memo_categories.len() <= 1 {
            last_one = true;
            return;
        }
        let Some(index) = store.memo_categories.iter().position(|c| c.id == id) else {
            return;
        };
        store.memo_categories.remove(index);
        let fallback = store
            .memo_categories
            .iter()
            .min_by_key(|c| c.sort_order)
            .map(|c| c.id)
            .unwrap_or(id);
        for memo in &mut store.memos {
            if memo.category_id == id {
                memo.category_id = fallback;
            }
        }
        changed = true;
    });

    if last_one {
        return Err("분류는 하나 이상 있어야 합니다".into());
    }
    Ok(changed)
}
