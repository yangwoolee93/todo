use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde_json::{Map, Value};
use tauri::{AppHandle, Manager};

static DOCUMENT_LOCK: Mutex<()> = Mutex::new(());

const FILE_NAME: &str = "arc.json";

pub fn document_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join(FILE_NAME))
}

pub fn load_menu(app: &AppHandle) -> Result<Value, String> {
    let path = document_path(app)?;
    with_document(|| load_menu_at(&path))
}

pub fn save_menu(app: &AppHandle, menu: Value) -> Result<(), String> {
    let path = document_path(app)?;
    with_document(|| save_menu_at(&path, menu))
}

pub fn load_memos(app: &AppHandle) -> Result<Value, String> {
    let path = document_path(app)?;
    with_document(|| load_memos_at(&path))
}

pub fn save_memos(app: &AppHandle, memos: Value) -> Result<(), String> {
    let path = document_path(app)?;
    with_document(|| save_memos_at(&path, memos))
}

pub fn load_todos(app: &AppHandle) -> Result<Value, String> {
    let path = document_path(app)?;
    with_document(|| load_todos_at(&path))
}

pub fn load_todo_statuses(app: &AppHandle) -> Result<Value, String> {
    let path = document_path(app)?;
    with_document(|| load_todo_statuses_at(&path))
}

pub fn load_timeline_views(app: &AppHandle) -> Result<Value, String> {
    let path = document_path(app)?;
    with_document(|| load_timeline_views_at(&path))
}

pub fn save_todos(app: &AppHandle, todos: Value, statuses: Value, views: Value) -> Result<(), String> {
    let path = document_path(app)?;
    with_document(|| save_todos_at(&path, todos, statuses, views))
}

fn with_document<T>(write: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let _guard = DOCUMENT_LOCK.lock().map_err(|err| err.to_string())?;
    write()
}

fn load_menu_at(path: &Path) -> Result<Value, String> {
    let doc = read_document(path)?;
    match doc.get("menu") {
        Some(menu) if menu.is_object() => Ok(menu.clone()),
        Some(_) => Err("menu 형식이 올바르지 않습니다.".into()),
        None => Ok(empty_menu()),
    }
}

fn save_menu_at(path: &Path, menu: Value) -> Result<(), String> {
    validate_menu(&menu)?;
    let mut doc = read_document(path)?;
    doc.entry("version".to_string()).or_insert(Value::from(1));
    doc.insert("menu".to_string(), menu);
    write_document(path, &doc)
}

fn load_memos_at(path: &Path) -> Result<Value, String> {
    let doc = read_document(path)?;
    match doc.get("memos") {
        Some(memos) if memos.is_array() => Ok(memos.clone()),
        Some(_) => Err("memos 형식이 올바르지 않습니다.".into()),
        None => Ok(serde_json::json!([])),
    }
}

fn save_memos_at(path: &Path, memos: Value) -> Result<(), String> {
    validate_memos(&memos)?;
    let mut doc = read_document(path)?;
    doc.entry("version".to_string()).or_insert(Value::from(1));
    doc.insert("memos".to_string(), memos);
    write_document(path, &doc)
}

fn validate_memos(memos: &Value) -> Result<(), String> {
    let Some(items) = memos.as_array() else {
        return Err("memos 형식이 올바르지 않습니다.".into());
    };
    for item in items {
        let Some(memo) = item.as_object() else {
            return Err("memo 형식이 올바르지 않습니다.".into());
        };
        if !required_text(memo, "id") || !required_text(memo, "pageId") {
            return Err("memo 식별자가 올바르지 않습니다.".into());
        }
        if !memo.get("title").is_some_and(Value::is_string)
            || !memo.get("body").is_some_and(Value::is_string)
        {
            return Err("memo 내용 형식이 올바르지 않습니다.".into());
        }
        if !memo.get("tags").is_some_and(|tags| {
            tags.as_array()
                .is_some_and(|items| items.iter().all(Value::is_string))
        }) {
            return Err("memo.tags 형식이 올바르지 않습니다.".into());
        }
        if !memo.get("pinned").is_some_and(Value::is_boolean) {
            return Err("memo.pinned 형식이 올바르지 않습니다.".into());
        }
        if !memo
            .get("pinnedAt")
            .is_some_and(|value| value.is_null() || value.is_number())
        {
            return Err("memo.pinnedAt 형식이 올바르지 않습니다.".into());
        }
        if !memo.get("createdAt").is_some_and(Value::is_number)
            || !memo.get("updatedAt").is_some_and(Value::is_number)
        {
            return Err("memo 날짜 형식이 올바르지 않습니다.".into());
        }
    }
    Ok(())
}

fn load_todos_at(path: &Path) -> Result<Value, String> {
    let doc = read_document(path)?;
    match doc.get("todos") {
        Some(todos) if todos.is_array() => Ok(todos.clone()),
        Some(_) => Err("todos 형식이 올바르지 않습니다.".into()),
        None => Ok(serde_json::json!([])),
    }
}

fn load_todo_statuses_at(path: &Path) -> Result<Value, String> {
    let doc = read_document(path)?;
    match doc.get("todoStatuses") {
        Some(statuses) if statuses.is_array() => Ok(statuses.clone()),
        Some(_) => Err("todoStatuses 형식이 올바르지 않습니다.".into()),
        None => Ok(serde_json::json!([])),
    }
}

fn load_timeline_views_at(path: &Path) -> Result<Value, String> {
    let doc = read_document(path)?;
    match doc.get("timelineViews") {
        Some(views) if views.is_array() => Ok(views.clone()),
        Some(_) => Err("timelineViews 형식이 올바르지 않습니다.".into()),
        None => Ok(serde_json::json!([])),
    }
}

fn save_todos_at(path: &Path, todos: Value, statuses: Value, views: Value) -> Result<(), String> {
    validate_todos(&todos)?;
    validate_statuses(&statuses)?;
    validate_views(&views)?;
    let mut doc = read_document(path)?;
    doc.entry("version".to_string()).or_insert(Value::from(1));
    doc.insert("todos".to_string(), todos);
    doc.insert("todoStatuses".to_string(), statuses);
    doc.insert("timelineViews".to_string(), views);
    write_document(path, &doc)
}

fn validate_todos(todos: &Value) -> Result<(), String> {
    let Some(items) = todos.as_array() else {
        return Err("todos 형식이 올바르지 않습니다.".into());
    };
    for item in items {
        let Some(todo) = item.as_object() else {
            return Err("todo 형식이 올바르지 않습니다.".into());
        };
        if !required_text(todo, "id") || !required_text(todo, "pageId") || !required_text(todo, "seriesId")
        {
            return Err("todo 식별자가 올바르지 않습니다.".into());
        }
        if !todo
            .get("date")
            .and_then(Value::as_str)
            .is_some_and(valid_todo_date)
        {
            return Err("todo 날짜 형식이 올바르지 않습니다.".into());
        }
        if !todo.get("title").is_some_and(Value::is_string)
            || !todo.get("body").is_some_and(Value::is_string)
        {
            return Err("todo 내용 형식이 올바르지 않습니다.".into());
        }
        if !todo.get("tags").is_some_and(|tags| {
            tags.as_array()
                .is_some_and(|items| items.iter().all(Value::is_string))
        }) {
            return Err("todo.tags 형식이 올바르지 않습니다.".into());
        }
        if !required_text(todo, "status") {
            return Err("todo 상태 형식이 올바르지 않습니다.".into());
        }
        if todo
            .get("parentSeriesId")
            .is_some_and(|value| !value.is_string())
        {
            return Err("todo 상위 형식이 올바르지 않습니다.".into());
        }
        if !todo.get("sortOrder").is_some_and(Value::is_number)
            || !todo.get("createdAt").is_some_and(Value::is_number)
            || !todo.get("updatedAt").is_some_and(Value::is_number)
        {
            return Err("todo 정렬 형식이 올바르지 않습니다.".into());
        }
    }
    Ok(())
}

fn validate_statuses(statuses: &Value) -> Result<(), String> {
    let Some(items) = statuses.as_array() else {
        return Err("todoStatuses 형식이 올바르지 않습니다.".into());
    };
    let mut seen = std::collections::HashSet::new();
    for item in items {
        let Some(status) = item.as_object() else {
            return Err("todoStatus 형식이 올바르지 않습니다.".into());
        };
        if !required_text(status, "id") || !required_text(status, "pageId") || !required_text(status, "name")
        {
            return Err("todoStatus 식별자가 올바르지 않습니다.".into());
        }
        let color = status.get("color").and_then(Value::as_str).unwrap_or("");
        if !is_hex_color(color) {
            return Err("todoStatus 색상 형식이 올바르지 않습니다.".into());
        }
        if !status.get("sortOrder").is_some_and(Value::is_number) {
            return Err("todoStatus 정렬 형식이 올바르지 않습니다.".into());
        }
        let key = format!(
            "{}\0{}",
            status.get("pageId").and_then(Value::as_str).unwrap_or(""),
            status.get("id").and_then(Value::as_str).unwrap_or("")
        );
        if !seen.insert(key) {
            return Err("todoStatus 식별자가 중복되었습니다.".into());
        }
    }
    Ok(())
}

fn validate_views(views: &Value) -> Result<(), String> {
    let Some(items) = views.as_array() else {
        return Err("timelineViews 형식이 올바르지 않습니다.".into());
    };
    let mut pages = std::collections::HashSet::new();
    for item in items {
        let Some(view) = item.as_object() else {
            return Err("timelineView 형식이 올바르지 않습니다.".into());
        };
        if !required_text(view, "pageId") {
            return Err("timelineView 페이지가 올바르지 않습니다.".into());
        }
        let page_id = view.get("pageId").and_then(Value::as_str).unwrap_or("");
        if !pages.insert(page_id.to_string()) {
            return Err("timelineView 페이지가 중복되었습니다.".into());
        }
        match view.get("join").and_then(Value::as_str) {
            Some("and" | "or") => {}
            _ => return Err("timelineView 결합이 올바르지 않습니다.".into()),
        }
        validate_sorts(view.get("sorts"))?;
        validate_filters(view.get("filters"))?;
    }
    Ok(())
}

fn validate_sorts(value: Option<&Value>) -> Result<(), String> {
    let Some(items) = value.and_then(Value::as_array) else {
        return Err("timelineView 정렬 형식이 올바르지 않습니다.".into());
    };
    let mut ids = std::collections::HashSet::new();
    let mut keys = std::collections::HashSet::new();
    for item in items {
        let Some(rule) = item.as_object() else {
            return Err("timelineView 정렬 형식이 올바르지 않습니다.".into());
        };
        if !required_text(rule, "id") {
            return Err("timelineView 정렬 식별자가 올바르지 않습니다.".into());
        }
        let id = rule.get("id").and_then(Value::as_str).unwrap_or("");
        if !ids.insert(id.to_string()) {
            return Err("timelineView 정렬 식별자가 중복되었습니다.".into());
        }
        let key = rule.get("key").and_then(Value::as_str).unwrap_or("");
        if key != "start" && key != "end" {
            return Err("timelineView 정렬 기준이 올바르지 않습니다.".into());
        }
        if !keys.insert(key.to_string()) {
            return Err("timelineView 정렬 기준이 중복되었습니다.".into());
        }
        let dir = rule.get("dir").and_then(Value::as_str).unwrap_or("");
        if dir != "asc" && dir != "desc" {
            return Err("timelineView 정렬 방향이 올바르지 않습니다.".into());
        }
    }
    Ok(())
}

fn validate_filters(value: Option<&Value>) -> Result<(), String> {
    let Some(items) = value.and_then(Value::as_array) else {
        return Err("timelineView 필터 형식이 올바르지 않습니다.".into());
    };
    let mut ids = std::collections::HashSet::new();
    for item in items {
        let Some(rule) = item.as_object() else {
            return Err("timelineView 필터 형식이 올바르지 않습니다.".into());
        };
        if !required_text(rule, "id") {
            return Err("timelineView 필터 식별자가 올바르지 않습니다.".into());
        }
        let id = rule.get("id").and_then(Value::as_str).unwrap_or("");
        if !ids.insert(id.to_string()) {
            return Err("timelineView 필터 식별자가 중복되었습니다.".into());
        }
        let Some(statuses) = rule.get("statuses").and_then(Value::as_array) else {
            return Err("timelineView 필터 상태가 올바르지 않습니다.".into());
        };
        if statuses.is_empty() {
            return Err("timelineView 필터 상태가 올바르지 않습니다.".into());
        }
        let mut seen = std::collections::HashSet::new();
        for status in statuses {
            let Some(name) = status.as_str().filter(|name| !name.trim().is_empty()) else {
                return Err("timelineView 필터 상태가 올바르지 않습니다.".into());
            };
            if !seen.insert(name.to_string()) {
                return Err("timelineView 필터 상태가 중복되었습니다.".into());
            }
        }
    }
    Ok(())
}

fn is_hex_color(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 7
        && bytes[0] == b'#'
        && bytes[1..].iter().all(|byte| byte.is_ascii_hexdigit())
}

fn valid_todo_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    let Some(year) = value.get(0..4).and_then(|part| part.parse::<i32>().ok()) else {
        return false;
    };
    let Some(month) = value.get(5..7).and_then(|part| part.parse::<u32>().ok()) else {
        return false;
    };
    let Some(day) = value.get(8..10).and_then(|part| part.parse::<u32>().ok()) else {
        return false;
    };
    if !(1..=12).contains(&month) {
        return false;
    }
    let max = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    };
    (1..=max).contains(&day)
}

fn required_text(memo: &Map<String, Value>, key: &str) -> bool {
    memo.get(key)
        .and_then(Value::as_str)
        .is_some_and(|value| !value.trim().is_empty())
}

fn empty_menu() -> Value {
    serde_json::json!({
        "groups": [],
        "pages": [],
        "selection": { "pageId": null, "groupId": null }
    })
}

fn validate_menu(menu: &Value) -> Result<(), String> {
    let Some(menu) = menu.as_object() else {
        return Err("menu 형식이 올바르지 않습니다.".into());
    };
    if !menu.get("groups").is_some_and(Value::is_array) {
        return Err("menu.groups 형식이 올바르지 않습니다.".into());
    }
    if !menu.get("pages").is_some_and(Value::is_array) {
        return Err("menu.pages 형식이 올바르지 않습니다.".into());
    }
    if !menu.get("selection").is_some_and(Value::is_object) {
        return Err("menu.selection 형식이 올바르지 않습니다.".into());
    }
    Ok(())
}

fn read_document(path: &Path) -> Result<Map<String, Value>, String> {
    if !path.exists() {
        return Ok(Map::new());
    }
    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    if raw.trim().is_empty() {
        return Ok(Map::new());
    }
    match serde_json::from_str(&raw).map_err(|err| err.to_string())? {
        Value::Object(map) => Ok(map),
        _ => Err("arc.json 형식이 올바르지 않습니다.".into()),
    }
}

fn write_document(path: &Path, doc: &Map<String, Value>) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|err| err.to_string())?;
    }
    let json = serde_json::to_string_pretty(&Value::Object(doc.clone()))
        .map_err(|err| err.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, format!("{json}\n")).map_err(|err| err.to_string())?;
    fs::rename(&tmp, path).map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_path(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        std::env::temp_dir().join(format!("orbit-mac-{name}-{nanos}.json"))
    }

    #[test]
    fn missing_file_loads_empty_menu() {
        let path = test_path("missing");
        let menu = load_menu_at(&path).unwrap();
        assert_eq!(menu["groups"], serde_json::json!([]));
        assert_eq!(menu["pages"], serde_json::json!([]));
        assert!(menu["selection"]["pageId"].is_null());
    }

    #[test]
    fn save_keeps_other_top_level_keys() {
        let path = test_path("preserve");
        fs::write(
            &path,
            r#"{"version":1,"timeline":{"items":[]}}"#,
        )
        .unwrap();

        save_menu_at(
            &path,
            serde_json::json!({
                "groups": [{ "id": "g1", "name": "사이드", "collapsed": false, "updatedAt": 1 }],
                "pages": [],
                "selection": { "pageId": null, "groupId": "g1" },
                "note": "kept"
            }),
        )
        .unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["version"], 1);
        assert_eq!(doc["timeline"]["items"], serde_json::json!([]));
        assert_eq!(doc["menu"]["groups"][0]["name"], "사이드");
        assert_eq!(doc["menu"]["note"], "kept");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn invalid_menu_does_not_replace_the_file() {
        let path = test_path("invalid");
        fs::write(&path, r#"{"timeline":{"ok":true}}"#).unwrap();
        let err = save_menu_at(&path, serde_json::json!({ "groups": [] })).unwrap_err();
        assert!(err.contains("menu.pages"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("timeline"));
        assert!(!raw.contains("\"menu\""));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn missing_file_loads_empty_memos() {
        let path = test_path("memos-missing");
        let memos = load_memos_at(&path).unwrap();
        assert_eq!(memos, serde_json::json!([]));
    }

    #[test]
    fn save_memos_keeps_menu() {
        let path = test_path("memos-keep-menu");
        fs::write(&path, r#"{"version":1,"menu":{"groups":[]}}"#).unwrap();
        save_memos_at(
            &path,
            serde_json::json!([{
                "id": "m1",
                "pageId": "p1",
                "title": "회의",
                "body": "",
                "tags": ["회의"],
                "pinned": false,
                "pinnedAt": null,
                "createdAt": 1,
                "updatedAt": 1
            }]),
        )
        .unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["menu"]["groups"], serde_json::json!([]));
        assert_eq!(doc["memos"][0]["title"], "회의");

        save_menu_at(
            &path,
            serde_json::json!({
                "groups": [],
                "pages": [],
                "selection": { "pageId": null, "groupId": null }
            }),
        )
        .unwrap();
        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["memos"][0]["id"], "m1");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn invalid_memos_do_not_replace_the_file() {
        let path = test_path("memos-invalid");
        fs::write(&path, r#"{"menu":{"ok":true}}"#).unwrap();
        let err = save_memos_at(&path, serde_json::json!([{ "id": "" }])).unwrap_err();
        assert!(err.contains("memo"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("menu"));
        assert!(!raw.contains("\"memos\""));
        let _ = fs::remove_file(path);
    }

    fn sample_todo() -> Value {
        serde_json::json!({
            "id": "t1",
            "pageId": "p1",
            "date": "2026-11-23",
            "title": "산책",
            "body": "",
            "tags": [],
            "status": "pending",
            "seriesId": "s1",
            "sortOrder": 1,
            "createdAt": 1,
            "updatedAt": 1
        })
    }

    #[test]
    fn missing_file_loads_empty_todos() {
        let path = test_path("todos-missing");
        let todos = load_todos_at(&path).unwrap();
        assert_eq!(todos, serde_json::json!([]));
    }

    #[test]
    fn save_todos_keeps_menu_and_memos() {
        let path = test_path("todos-keep");
        fs::write(&path, r#"{"version":1,"menu":{"groups":[]},"memos":[{"id":"m1"}]}"#).unwrap();
        save_todos_at(
            &path,
            serde_json::json!([sample_todo()]),
            serde_json::json!([{
                "id": "pending",
                "pageId": "p1",
                "name": "대기",
                "color": "#a8a29e",
                "sortOrder": 0
            }]),
            serde_json::json!([]),
        )
        .unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["menu"]["groups"], serde_json::json!([]));
        assert_eq!(doc["memos"][0]["id"], "m1");
        assert_eq!(doc["todos"][0]["title"], "산책");
        assert_eq!(doc["todoStatuses"][0]["name"], "대기");

        save_menu_at(
            &path,
            serde_json::json!({
                "groups": [],
                "pages": [],
                "selection": { "pageId": null, "groupId": null }
            }),
        )
        .unwrap();
        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["todos"][0]["id"], "t1");
        assert_eq!(doc["todoStatuses"][0]["id"], "pending");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn invalid_todos_do_not_replace_the_file() {
        let path = test_path("todos-invalid");
        fs::write(&path, r#"{"menu":{"ok":true}}"#).unwrap();
        let mut todo = sample_todo();
        todo["date"] = serde_json::json!("2026-02-31");
        let err = save_todos_at(
            &path,
            serde_json::json!([todo]),
            serde_json::json!([]),
            serde_json::json!([]),
        )
        .unwrap_err();
        assert!(err.contains("todo"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("menu"));
        assert!(!raw.contains("\"todos\""));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn invalid_status_color_does_not_replace_the_file() {
        let path = test_path("statuses-invalid");
        fs::write(&path, r#"{"menu":{"ok":true}}"#).unwrap();
        let err = save_todos_at(
            &path,
            serde_json::json!([sample_todo()]),
            serde_json::json!([{
                "id": "pending",
                "pageId": "p1",
                "name": "대기",
                "color": "green",
                "sortOrder": 0
            }]),
            serde_json::json!([]),
        )
        .unwrap_err();
        assert!(err.contains("색상"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("menu"));
        assert!(!raw.contains("todoStatuses"));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn save_views_keeps_statuses_and_menu_save_keeps_views() {
        let path = test_path("views-keep");
        fs::write(&path, r#"{"version":1,"menu":{"groups":[]}}"#).unwrap();
        save_todos_at(
            &path,
            serde_json::json!([sample_todo()]),
            serde_json::json!([{
                "id": "failed",
                "pageId": "p1",
                "name": "실패",
                "color": "#ea580c",
                "sortOrder": 2
            }]),
            serde_json::json!([{
                "pageId": "p1",
                "join": "or",
                "sorts": [{ "id": "sort-1", "key": "start", "dir": "desc" }],
                "filters": [{ "id": "filter-1", "statuses": ["pending", "success"] }]
            }]),
        )
        .unwrap();
        let views = load_timeline_views_at(&path).unwrap();
        assert_eq!(views[0]["sorts"][0]["dir"], "desc");
        assert_eq!(views[0]["filters"][0]["statuses"][1], "success");

        save_menu_at(
            &path,
            serde_json::json!({
                "groups": [],
                "pages": [],
                "selection": { "pageId": null, "groupId": null }
            }),
        )
        .unwrap();
        let raw = fs::read_to_string(&path).unwrap();
        let doc: Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(doc["todoStatuses"][0]["name"], "실패");
        assert_eq!(doc["timelineViews"][0]["join"], "or");

        let err = save_todos_at(
            &path,
            serde_json::json!([sample_todo()]),
            serde_json::json!([]),
            serde_json::json!([{
                "pageId": "p1",
                "join": "maybe",
                "sorts": [],
                "filters": []
            }]),
        )
        .unwrap_err();
        assert!(err.contains("결합"));
        let raw = fs::read_to_string(&path).unwrap();
        assert!(raw.contains("\"desc\""));
        let _ = fs::remove_file(path);
    }
}
