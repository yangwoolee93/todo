use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::ids::new_id;
use crate::models::{MemoCategory, MemoItem, TodoDatabase};
use crate::storage::{mutate_store, read_store};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn next_memo_sort_order(memos: &[MemoItem], category_id: &str) -> i64 {
    memos
        .iter()
        .filter(|m| m.category_id == category_id)
        .map(|m| m.sort_order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn next_category_sort_order(categories: &[MemoCategory]) -> i64 {
    categories.iter().map(|c| c.sort_order).max().unwrap_or(-1) + 1
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

/// 기본 분류(루틴/예정)는 두 기기가 각자 처음 실행해도 같은 항목으로
/// 인식되도록 id를 고정 문자열로 둔다. 사용자가 만드는 분류는 `new_id()`로
/// 전역 고유 id를 받는다.
fn default_memo_categories() -> Vec<MemoCategory> {
    let now = now_ms();
    vec![
        MemoCategory {
            id: "default-routine".into(),
            name: "루틴".into(),
            sort_order: 0,
            color: "teal".into(),
            updated_at: now,
            deleted_at: None,
        },
        MemoCategory {
            id: "default-planned".into(),
            name: "예정".into(),
            sort_order: 1,
            color: "amber".into(),
            updated_at: now,
            deleted_at: None,
        },
    ]
}

fn category_id_value_to_string(v: &serde_json::Value) -> Option<String> {
    match v {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn category_id_for_kind(categories: &[serde_json::Value], kind: &str) -> String {
    let name = if kind == "planned" {
        "예정"
    } else {
        "루틴"
    };
    categories
        .iter()
        .find_map(|category| {
            if category.get("name").and_then(|v| v.as_str()) == Some(name) {
                category.get("id").and_then(category_id_value_to_string)
            } else {
                None
            }
        })
        .or_else(|| {
            categories
                .first()
                .and_then(|category| category.get("id").and_then(category_id_value_to_string))
        })
        .unwrap_or_else(|| "default-routine".to_string())
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
        if obj.get("category_id").is_some() {
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

fn json_id_to_string(v: &serde_json::Value) -> Option<String> {
    match v {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

/// 옛 데이터의 숫자 id를 문자열 고유 키로 바꾸고, 없는 `updated_at`을 채운다.
/// 기기 간 병합을 하려면 id가 전역에서 겹치지 않는 문자열이어야 하는데,
/// 예전에는 기기 안에서만 유효한 숫자(생성 시각·순차 증가값)를 썼다.
/// 이 함수는 그 값을 그대로 문자열로 바꿔 참조 관계(예: 메모 → 분류)를
/// 깨지 않으면서 새 스키마로 옮긴다. 이미 문자열이면 그대로 둔다(멱등).
pub fn migrate_ids(value: &mut serde_json::Value) {
    let now = now_ms();

    if let Some(categories) = value
        .get_mut("memo_categories")
        .and_then(|v| v.as_array_mut())
    {
        for category in categories.iter_mut() {
            if let Some(obj) = category.as_object_mut() {
                if let Some(id_str) = obj.get("id").and_then(json_id_to_string) {
                    obj.insert("id".into(), serde_json::Value::String(id_str));
                }
                obj.entry("updated_at").or_insert(serde_json::json!(now));
            }
        }
    }

    if let Some(memos) = value.get_mut("memos").and_then(|v| v.as_array_mut()) {
        for memo in memos.iter_mut() {
            if let Some(obj) = memo.as_object_mut() {
                if let Some(id_str) = obj.get("id").and_then(json_id_to_string) {
                    obj.insert("id".into(), serde_json::Value::String(id_str));
                }
                if let Some(cat_id_str) = obj.get("category_id").and_then(json_id_to_string) {
                    obj.insert("category_id".into(), serde_json::Value::String(cat_id_str));
                }
                let created_at = obj
                    .get("created_at")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(now);
                obj.entry("updated_at")
                    .or_insert(serde_json::json!(created_at));
            }
        }
    }

    if let Some(todos) = value.get_mut("todos").and_then(|v| v.as_array_mut()) {
        for todo in todos.iter_mut() {
            if let Some(obj) = todo.as_object_mut() {
                if let Some(id_str) = obj.get("id").and_then(json_id_to_string) {
                    obj.insert("id".into(), serde_json::Value::String(id_str));
                }
                let created_at = obj
                    .get("created_at")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(now);
                obj.entry("updated_at")
                    .or_insert(serde_json::json!(created_at));
            }
        }
    }
}

pub fn parse_database(raw: &str) -> Result<TodoDatabase, String> {
    let mut value: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    migrate_memo_json(&mut value);
    migrate_ids(&mut value);
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
    let fallback = store
        .memo_categories
        .iter()
        .find(|c| c.deleted_at.is_none())
        .map(|c| c.id.clone())
        .unwrap_or_else(|| store.memo_categories[0].id.clone());
    let valid: HashSet<String> = store
        .memo_categories
        .iter()
        .filter(|c| c.deleted_at.is_none())
        .map(|c| c.id.clone())
        .collect();

    for (index, category) in store.memo_categories.iter_mut().enumerate() {
        if !is_memo_color(&category.color) {
            let name = category.name.clone();
            category.color = default_color_for_name(&name, index).to_string();
            changed = true;
        }
    }

    for memo in &mut store.memos {
        if !valid.contains(&memo.category_id) {
            memo.category_id = fallback.clone();
            memo.updated_at = now_ms();
            changed = true;
        }
    }

    changed
}

fn category_exists(store: &TodoDatabase, category_id: &str) -> bool {
    store
        .memo_categories
        .iter()
        .any(|c| c.id == category_id && c.deleted_at.is_none())
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
    let active: Vec<MemoItem> = store
        .memos
        .into_iter()
        .filter(|m| m.deleted_at.is_none())
        .collect();
    Ok(sort_memos(active))
}

#[tauri::command]
pub fn list_memo_categories(app: AppHandle) -> Result<Vec<MemoCategory>, String> {
    let store = read_store(&app);
    let active: Vec<MemoCategory> = store
        .memo_categories
        .into_iter()
        .filter(|c| c.deleted_at.is_none())
        .collect();
    Ok(sort_categories(active))
}

#[tauri::command]
pub fn create_memo(
    app: AppHandle,
    category_id: String,
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
        if !category_exists(store, &category_id) {
            return;
        }
        let now = now_ms();
        let sort_order = next_memo_sort_order(&store.memos, &category_id);
        let item = MemoItem {
            id: new_id(),
            category_id: category_id.clone(),
            title: title.clone(),
            note: note.clone(),
            created_at: now,
            sort_order,
            updated_at: now,
            deleted_at: None,
        };
        store.memos.push(item.clone());
        created = Some(item);
    });

    created.ok_or_else(|| "유효하지 않은 분류입니다".into())
}

#[tauri::command]
pub fn update_memo(
    app: AppHandle,
    id: String,
    title: String,
    note: String,
    category_id: String,
) -> Result<bool, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("제목이 비어있습니다".into());
    }
    let note = note.trim().to_string();

    let mut changed = false;
    mutate_store(&app, |store| {
        if !category_exists(store, &category_id) {
            return;
        }
        let moving = store
            .memos
            .iter()
            .any(|m| m.id == id && m.deleted_at.is_none() && m.category_id != category_id);
        let next_order = if moving {
            Some(next_memo_sort_order(&store.memos, &category_id))
        } else {
            None
        };
        if let Some(item) = store
            .memos
            .iter_mut()
            .find(|m| m.id == id && m.deleted_at.is_none())
        {
            if let Some(order) = next_order {
                item.sort_order = order;
            }
            item.title = title.clone();
            item.note = note.clone();
            item.category_id = category_id.clone();
            item.updated_at = now_ms();
            changed = true;
        }
    });

    Ok(changed)
}

#[tauri::command]
pub fn delete_memo(app: AppHandle, id: String) -> Result<bool, String> {
    let mut changed = false;
    mutate_store(&app, |store| {
        if let Some(item) = store
            .memos
            .iter_mut()
            .find(|m| m.id == id && m.deleted_at.is_none())
        {
            let now = now_ms();
            item.deleted_at = Some(now);
            item.updated_at = now;
            changed = true;
        }
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
            .any(|c| c.deleted_at.is_none() && c.name == name)
        {
            return;
        }
        let now = now_ms();
        let category = MemoCategory {
            id: new_id(),
            name: name.clone(),
            sort_order: next_category_sort_order(&store.memo_categories),
            color: color.clone(),
            updated_at: now,
            deleted_at: None,
        };
        store.memo_categories.push(category.clone());
        created = Some(category);
    });

    created.ok_or_else(|| "이미 있는 이름입니다".into())
}

#[tauri::command]
pub fn update_memo_category(
    app: AppHandle,
    id: String,
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
            .any(|c| c.id != id && c.deleted_at.is_none() && c.name == name)
        {
            duplicate = true;
            return;
        }
        if let Some(category) = store
            .memo_categories
            .iter_mut()
            .find(|c| c.id == id && c.deleted_at.is_none())
        {
            category.name = name.clone();
            category.color = color.clone();
            category.updated_at = now_ms();
            changed = true;
        }
    });

    if duplicate {
        return Err("이미 있는 이름입니다".into());
    }
    Ok(changed)
}

#[tauri::command]
pub fn delete_memo_category(app: AppHandle, id: String) -> Result<bool, String> {
    let mut changed = false;
    let mut last_one = false;

    mutate_store(&app, |store| {
        let active_count = store
            .memo_categories
            .iter()
            .filter(|c| c.deleted_at.is_none())
            .count();
        if active_count <= 1 {
            last_one = true;
            return;
        }
        let Some(idx) = store
            .memo_categories
            .iter()
            .position(|c| c.id == id && c.deleted_at.is_none())
        else {
            return;
        };

        let now = now_ms();
        store.memo_categories[idx].deleted_at = Some(now);
        store.memo_categories[idx].updated_at = now;
        changed = true;

        let fallback_id = store
            .memo_categories
            .iter()
            .filter(|c| c.id != id && c.deleted_at.is_none())
            .min_by_key(|c| c.sort_order)
            .map(|c| c.id.clone());

        if let Some(fallback_id) = fallback_id {
            for memo in &mut store.memos {
                if memo.category_id == id {
                    memo.category_id = fallback_id.clone();
                    memo.updated_at = now;
                }
            }
        }
    });

    if last_one {
        return Err("분류는 하나 이상 있어야 합니다".into());
    }
    Ok(changed)
}
