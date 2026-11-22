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
}
