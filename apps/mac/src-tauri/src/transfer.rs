use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{Map, Value};
use tauri::AppHandle;

use crate::document::{
    document_path, empty_menu, read_document, validate_memos, validate_menu, validate_statuses,
    validate_todos, validate_views, with_document, write_document,
};

const MAX_BACKUPS: usize = 20;

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub(crate) struct MergeSummary {
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub file_path: String,
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferTimes {
    pub exported_at: Option<i64>,
    pub imported_at: Option<i64>,
}

#[tauri::command]
pub async fn export_document(app: AppHandle) -> Result<Option<String>, String> {
    let file_name = format!("arc-{}.json", now_ms());
    let picked = tauri::async_runtime::spawn_blocking(move || pick_export_path(file_name))
        .await
        .map_err(|err| err.to_string())?;
    let Some(path) = picked else {
        return Ok(None);
    };
    let path_str = path_to_string(&path)?;
    let store = document_path(&app)?;
    with_document(|| {
        let mut doc = read_document(&store)?;
        ensure_collections(&mut doc);
        doc.insert("lastExportedAt".to_string(), Value::from(now_ms()));
        write_document(Path::new(&path_str), &doc)?;
        write_document(&store, &doc)?;
        Ok(())
    })?;
    Ok(Some(path_str))
}

#[tauri::command]
pub async fn import_document(app: AppHandle, mode: String) -> Result<Option<ImportReport>, String> {
    if mode != "merge" && mode != "replace" {
        return Err("가져오기 방식이 올바르지 않습니다.".into());
    }
    let title = if mode == "merge" {
        "데이터 병합"
    } else {
        "데이터 덮어쓰기"
    };
    let picked = tauri::async_runtime::spawn_blocking(move || pick_import_path(title))
        .await
        .map_err(|err| err.to_string())?;
    let Some(path) = picked else {
        return Ok(None);
    };
    let path_str = path_to_string(&path)?;
    let raw = fs::read_to_string(&path_str).map_err(|err| err.to_string())?;
    let incoming = parse_import(&raw)?;
    let store = document_path(&app)?;
    let summary = with_document(|| {
        backup_document(&store);
        let mut local = read_document(&store)?;
        ensure_collections(&mut local);
        let (mut next, summary) = if mode == "merge" {
            merge_documents(&local, &incoming)
        } else {
            (replace_document(&local, incoming), MergeSummary::default())
        };
        next.insert("lastImportedAt".to_string(), Value::from(now_ms()));
        validate_import(&next)?;
        write_document(&store, &next)?;
        Ok(summary)
    })?;
    Ok(Some(ImportReport {
        file_path: path_str,
        added: summary.added,
        updated: summary.updated,
        deleted: summary.deleted,
    }))
}

#[tauri::command]
pub fn transfer_times(app: AppHandle) -> Result<TransferTimes, String> {
    let path = document_path(&app)?;
    with_document(|| {
        let doc = read_document(&path)?;
        Ok(TransferTimes {
            exported_at: number_at(&doc, "lastExportedAt"),
            imported_at: number_at(&doc, "lastImportedAt"),
        })
    })
}

pub(crate) fn parse_import(raw: &str) -> Result<Map<String, Value>, String> {
    let value: Value =
        serde_json::from_str(raw).map_err(|_| "유효하지 않은 JSON 형식입니다.".to_string())?;
    let Value::Object(mut doc) = value else {
        return Err("이 앱에서 내보낸 파일이 아닙니다.".into());
    };
    if !doc.get("menu").is_some_and(Value::is_object) {
        return Err("이 앱에서 내보낸 파일이 아닙니다.".into());
    }
    ensure_collections(&mut doc);
    validate_import(&doc)?;
    Ok(doc)
}

pub(crate) fn merge_documents(
    local: &Map<String, Value>,
    incoming: &Map<String, Value>,
) -> (Map<String, Value>, MergeSummary) {
    let mut summary = MergeSummary::default();
    let mut doc = local.clone();
    ensure_collections(&mut doc);
    doc.insert(
        "menu".to_string(),
        merge_menu(local.get("menu"), incoming.get("menu"), &mut summary),
    );
    doc.insert(
        "memos".to_string(),
        Value::Array(merge_list(
            array_in(local, "memos"),
            array_in(incoming, "memos"),
            id_key,
            &mut summary,
        )),
    );
    doc.insert(
        "todos".to_string(),
        Value::Array(merge_list(
            array_in(local, "todos"),
            array_in(incoming, "todos"),
            id_key,
            &mut summary,
        )),
    );
    doc.insert(
        "todoStatuses".to_string(),
        Value::Array(merge_list(
            array_in(local, "todoStatuses"),
            array_in(incoming, "todoStatuses"),
            scoped_key,
            &mut summary,
        )),
    );
    doc.insert(
        "timelineViews".to_string(),
        Value::Array(merge_list(
            array_in(local, "timelineViews"),
            array_in(incoming, "timelineViews"),
            scoped_key,
            &mut summary,
        )),
    );
    overlay_device(local, &mut doc);
    (doc, summary)
}

pub(crate) fn replace_document(
    local: &Map<String, Value>,
    mut incoming: Map<String, Value>,
) -> Map<String, Value> {
    ensure_collections(&mut incoming);
    overlay_device(local, &mut incoming);
    incoming
}

fn validate_import(doc: &Map<String, Value>) -> Result<(), String> {
    let menu = doc.get("menu").ok_or("이 앱에서 내보낸 파일이 아닙니다.")?;
    validate_menu(menu)?;
    check_named(array_at(Some(menu), "groups"), "프로젝트")?;
    check_pages(array_at(Some(menu), "pages"))?;
    let memos = array_in(doc, "memos");
    let todos = array_in(doc, "todos");
    let statuses = array_in(doc, "todoStatuses");
    let views = array_in(doc, "timelineViews");
    validate_memos(&Value::Array(memos))?;
    validate_todos(&Value::Array(todos))?;
    validate_statuses(&Value::Array(statuses))?;
    validate_views(&Value::Array(views))?;
    Ok(())
}

fn check_named(items: Vec<Value>, label: &str) -> Result<(), String> {
    for item in items {
        let Some(obj) = item.as_object() else {
            return Err(format!("{label} 형식이 올바르지 않습니다."));
        };
        let id = obj.get("id").and_then(Value::as_str).unwrap_or("").trim();
        if id.is_empty() || !obj.get("name").is_some_and(Value::is_string) {
            return Err(format!("{label} 형식이 올바르지 않습니다."));
        }
    }
    Ok(())
}

fn check_pages(items: Vec<Value>) -> Result<(), String> {
    for item in items {
        let Some(obj) = item.as_object() else {
            return Err("페이지 형식이 올바르지 않습니다.".into());
        };
        let id = obj.get("id").and_then(Value::as_str).unwrap_or("").trim();
        let group = obj
            .get("groupId")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        if id.is_empty()
            || group.is_empty()
            || !obj.get("name").is_some_and(Value::is_string)
            || !obj.get("type").is_some_and(Value::is_string)
        {
            return Err("페이지 형식이 올바르지 않습니다.".into());
        }
    }
    Ok(())
}

fn merge_menu(
    local: Option<&Value>,
    incoming: Option<&Value>,
    summary: &mut MergeSummary,
) -> Value {
    let mut menu = local
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_else(|| empty_menu().as_object().cloned().unwrap_or_default());
    let groups = merge_list(
        array_at(local, "groups"),
        array_at(incoming, "groups"),
        id_key,
        summary,
    );
    let pages = merge_list(
        array_at(local, "pages"),
        array_at(incoming, "pages"),
        id_key,
        summary,
    );
    menu.insert("groups".to_string(), Value::Array(groups));
    menu.insert("pages".to_string(), Value::Array(pages));
    Value::Object(menu)
}

fn merge_list(
    local: Vec<Value>,
    incoming: Vec<Value>,
    key_of: fn(&Value) -> Option<String>,
    summary: &mut MergeSummary,
) -> Vec<Value> {
    let mut order = Vec::new();
    let mut map = HashMap::new();
    for item in local {
        let Some(key) = key_of(&item) else {
            continue;
        };
        if map.contains_key(&key) {
            continue;
        }
        order.push(key.clone());
        map.insert(key, item);
    }
    for item in incoming {
        let Some(key) = key_of(&item) else {
            continue;
        };
        match map.get(&key) {
            None => {
                if !is_tombstone(&item) {
                    summary.added += 1;
                }
                order.push(key.clone());
                map.insert(key, item);
            }
            Some(existing) => {
                if updated_at(&item) > updated_at(existing) {
                    if is_tombstone(&item) && !is_tombstone(existing) {
                        summary.deleted += 1;
                    } else if !is_tombstone(&item) {
                        summary.updated += 1;
                    }
                    map.insert(key, item);
                }
            }
        }
    }
    order
        .into_iter()
        .filter_map(|key| map.remove(&key))
        .collect()
}

/// 접힘, 선택 페이지, 보고 있는 보기는 기기마다 다르다.
fn overlay_device(local: &Map<String, Value>, doc: &mut Map<String, Value>) {
    let selection = local
        .get("menu")
        .and_then(|menu| menu.get("selection"))
        .cloned();
    let collapsed = collapsed_of(local);
    let local_views = array_in(local, "timelineViews");
    if let Some(menu) = doc.get_mut("menu").and_then(Value::as_object_mut) {
        if let Some(selection) = selection {
            menu.insert("selection".to_string(), selection);
        }
        if let Some(groups) = menu.get_mut("groups").and_then(Value::as_array_mut) {
            for group in groups {
                let Some(obj) = group.as_object_mut() else {
                    continue;
                };
                let Some(id) = obj.get("id").and_then(Value::as_str).map(str::to_string) else {
                    continue;
                };
                if let Some(value) = collapsed.get(&id) {
                    obj.insert("collapsed".to_string(), value.clone());
                }
            }
        }
    }
    if let Some(views) = doc.get_mut("timelineViews").and_then(Value::as_array_mut) {
        overlay_active(&local_views, views);
    }
}

fn overlay_active(local: &[Value], views: &mut [Value]) {
    let mut chosen = HashMap::new();
    for view in local {
        if is_tombstone(view) {
            continue;
        }
        let Some(obj) = view.as_object() else {
            continue;
        };
        if obj.get("active").and_then(Value::as_bool) != Some(true) {
            continue;
        }
        let Some(page) = text_at(obj, "pageId") else {
            continue;
        };
        let id = text_at(obj, "id").unwrap_or_else(|| page.clone());
        chosen.insert(page, id);
    }
    let mut keep = HashMap::new();
    for view in views.iter() {
        if is_tombstone(view) {
            continue;
        }
        let Some(obj) = view.as_object() else {
            continue;
        };
        let Some(page) = text_at(obj, "pageId") else {
            continue;
        };
        let id = text_at(obj, "id").unwrap_or_else(|| page.clone());
        if chosen.get(&page).is_some_and(|active| active == &id) {
            keep.insert(page, id);
        }
    }
    if keep.is_empty() {
        return;
    }
    for view in views.iter_mut() {
        let Some(obj) = view.as_object_mut() else {
            continue;
        };
        let Some(page) = text_at(obj, "pageId") else {
            continue;
        };
        let Some(active_id) = keep.get(&page) else {
            continue;
        };
        let id = text_at(obj, "id").unwrap_or_else(|| page.clone());
        obj.insert("active".to_string(), Value::Bool(&id == active_id));
    }
}

fn collapsed_of(doc: &Map<String, Value>) -> HashMap<String, Value> {
    let mut map = HashMap::new();
    let Some(groups) = doc
        .get("menu")
        .and_then(|menu| menu.get("groups"))
        .and_then(Value::as_array)
    else {
        return map;
    };
    for group in groups {
        let Some(obj) = group.as_object() else {
            continue;
        };
        let Some(id) = text_at(obj, "id") else {
            continue;
        };
        if let Some(collapsed) = obj.get("collapsed").filter(|value| value.is_boolean()) {
            map.insert(id, collapsed.clone());
        }
    }
    map
}

fn ensure_collections(doc: &mut Map<String, Value>) {
    doc.entry("version".to_string()).or_insert(Value::from(1));
    doc.entry("menu".to_string()).or_insert(empty_menu());
    doc.entry("memos".to_string())
        .or_insert(Value::Array(Vec::new()));
    doc.entry("todos".to_string())
        .or_insert(Value::Array(Vec::new()));
    doc.entry("todoStatuses".to_string())
        .or_insert(Value::Array(Vec::new()));
    doc.entry("timelineViews".to_string())
        .or_insert(Value::Array(Vec::new()));
}

fn array_in(doc: &Map<String, Value>, key: &str) -> Vec<Value> {
    doc.get(key)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

fn array_at(value: Option<&Value>, key: &str) -> Vec<Value> {
    value
        .and_then(|item| item.get(key))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

fn id_key(item: &Value) -> Option<String> {
    let text = item.get("id")?.as_str()?.trim();
    if text.is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

fn scoped_key(item: &Value) -> Option<String> {
    let page = item.get("pageId")?.as_str()?.trim();
    if page.is_empty() {
        return None;
    }
    let id = item
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .unwrap_or(page);
    Some(format!("{page}\0{id}"))
}

fn text_at(obj: &Map<String, Value>, key: &str) -> Option<String> {
    let text = obj.get(key)?.as_str()?.trim();
    if text.is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

fn is_tombstone(item: &Value) -> bool {
    item.get("deletedAt").is_some_and(Value::is_number)
}

fn updated_at(item: &Value) -> i64 {
    match item.get("updatedAt") {
        Some(value) => value
            .as_i64()
            .or_else(|| value.as_f64().map(|number| number as i64))
            .unwrap_or(0),
        None => 0,
    }
}

fn number_at(doc: &Map<String, Value>, key: &str) -> Option<i64> {
    doc.get(key).and_then(|value| {
        value
            .as_i64()
            .or_else(|| value.as_f64().map(|number| number as i64))
    })
}

fn backup_document(path: &Path) {
    if !path.exists() {
        return;
    }
    let Some(parent) = path.parent() else {
        return;
    };
    let dir = parent.join("backups");
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let dest = dir.join(format!("arc-{}.json", now_ms()));
    if fs::copy(path, dest).is_err() {
        return;
    }
    let Ok(entries) = fs::read_dir(&dir) else {
        return;
    };
    let mut files: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|file| file.extension().is_some_and(|ext| ext == "json"))
        .collect();
    if files.len() <= MAX_BACKUPS {
        return;
    }
    files.sort();
    let extra = files.len() - MAX_BACKUPS;
    for file in files.into_iter().take(extra) {
        let _ = fs::remove_file(file);
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn pick_export_path(file_name: String) -> Option<PathBuf> {
    // 파일 형식 제한을 걸면 macOS 저장 창이 버튼을 켜지 못한 채 멈춘다.
    // 제안 이름에 .json이 들어 있고, 빠지면 저장할 때 붙인다.
    rfd::FileDialog::new()
        .set_title("데이터 내보내기")
        .set_file_name(file_name)
        .save_file()
        .map(with_json_extension)
}

fn pick_import_path(title: &str) -> Option<PathBuf> {
    rfd::FileDialog::new()
        .set_title(title)
        .add_filter("JSON", &["json"])
        .pick_file()
}

fn with_json_extension(path: PathBuf) -> PathBuf {
    let is_json = path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("json"));
    if is_json {
        return path;
    }
    let mut name = path.into_os_string();
    name.push(".json");
    PathBuf::from(name)
}

fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| "경로를 문자열로 변환할 수 없습니다.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn as_map(value: Value) -> Map<String, Value> {
        value.as_object().cloned().unwrap()
    }

    #[test]
    fn merge_keeps_newer_row_and_local_device_state() {
        let local = as_map(json!({
            "version": 1,
            "menu": {
                "groups": [{
                    "id": "g",
                    "name": "예전",
                    "collapsed": false,
                    "updatedAt": 1,
                    "deletedAt": null
                }],
                "pages": [],
                "selection": { "pageId": "keep", "groupId": null }
            },
            "memos": [],
            "todos": [{
                "id": "day",
                "pageId": "p",
                "date": "2026-11-01",
                "title": "할일",
                "body": "",
                "tags": [],
                "status": "pending",
                "seriesId": "s",
                "sortOrder": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "deletedAt": null,
                "omittedAt": null,
                "trashedWith": ""
            }],
            "todoStatuses": [{
                "id": "custom",
                "pageId": "p",
                "name": "검토",
                "color": "#a78bfa",
                "sortOrder": 3,
                "updatedAt": 1,
                "deletedAt": null
            }],
            "timelineViews": [{
                "pageId": "p",
                "id": "v",
                "name": "기본",
                "active": true,
                "join": "and",
                "sorts": [],
                "filters": [],
                "bars": [],
                "updatedAt": 4,
                "deletedAt": null
            }]
        }));
        let incoming = as_map(json!({
            "version": 1,
            "menu": {
                "groups": [{
                    "id": "g",
                    "name": "새이름",
                    "collapsed": true,
                    "updatedAt": 5,
                    "deletedAt": null
                }],
                "pages": [{
                    "id": "p2",
                    "groupId": "g",
                    "type": "timeline",
                    "name": "화면",
                    "updatedAt": 2,
                    "deletedAt": null
                }],
                "selection": { "pageId": "p2", "groupId": null }
            },
            "memos": [{
                "id": "m",
                "pageId": "p",
                "title": "메모",
                "body": "",
                "tags": [],
                "pinned": false,
                "pinnedAt": null,
                "createdAt": 1,
                "updatedAt": 1,
                "deletedAt": null
            }],
            "todos": [{
                "id": "day",
                "pageId": "p",
                "date": "2026-11-01",
                "title": "할일",
                "body": "",
                "tags": [],
                "status": "pending",
                "seriesId": "s",
                "sortOrder": 1,
                "createdAt": 1,
                "updatedAt": 6,
                "deletedAt": null,
                "omittedAt": 6,
                "trashedWith": ""
            }],
            "todoStatuses": [{
                "id": "custom",
                "pageId": "p",
                "name": "검토",
                "color": "#a78bfa",
                "sortOrder": 3,
                "updatedAt": 7,
                "deletedAt": 7
            }],
            "timelineViews": [{
                "pageId": "p",
                "id": "v",
                "name": "다른",
                "active": false,
                "join": "or",
                "sorts": [],
                "filters": [],
                "bars": [],
                "updatedAt": 3,
                "deletedAt": null
            }]
        }));

        let (merged, summary) = merge_documents(&local, &incoming);
        assert_eq!(summary.added, 2);
        assert_eq!(summary.updated, 2);
        assert_eq!(summary.deleted, 1);
        assert_eq!(merged["menu"]["groups"][0]["name"], "새이름");
        assert_eq!(merged["menu"]["groups"][0]["collapsed"], false);
        assert_eq!(merged["menu"]["selection"]["pageId"], "keep");
        assert_eq!(merged["todos"][0]["omittedAt"], 6);
        assert_eq!(merged["todoStatuses"][0]["deletedAt"], 7);
        assert_eq!(merged["timelineViews"][0]["name"], "기본");
        assert_eq!(merged["timelineViews"][0]["active"], true);
        assert_eq!(merged["memos"][0]["id"], "m");

        let replaced = replace_document(&local, incoming);
        assert_eq!(replaced["menu"]["groups"][0]["name"], "새이름");
        assert_eq!(replaced["menu"]["groups"][0]["collapsed"], false);
        assert_eq!(replaced["menu"]["selection"]["pageId"], "keep");
        assert_eq!(replaced["timelineViews"][0]["active"], true);
        assert_eq!(replaced["todos"][0]["omittedAt"], 6);
    }

    #[test]
    fn rejects_a_file_from_another_app() {
        let err = parse_import(r#"{"todos":[]}"#).unwrap_err();
        assert!(err.contains("내보낸"));
    }

    #[test]
    fn rejects_a_day_removed_without_a_stamp() {
        let err = parse_import(
            r#"{
                "menu": {"groups":[],"pages":[],"selection":{"pageId":null,"groupId":null}},
                "memos": [],
                "todos": [{
                    "id": "day",
                    "pageId": "p",
                    "date": "2026-11-01",
                    "title": "할일",
                    "body": "",
                    "tags": [],
                    "status": "pending",
                    "seriesId": "s",
                    "sortOrder": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "omittedAt": "gone"
                }],
                "todoStatuses": [],
                "timelineViews": []
            }"#,
        )
        .unwrap_err();
        assert!(err.contains("기간"));
    }
}
