use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::ids::new_id;
use crate::models::{DaySummary, DisplayTodo, TodoDatabase, TodoItem, TodoSpan};
use crate::storage::{mutate_store, read_store};

// ─── 유틸 ───────────────────────────────────────────────────────────────────

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn new_batch_id() -> String {
    format!("batch-{}", new_id())
}

fn is_valid_date(s: &str) -> bool {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    parts[0].len() == 4
        && parts[1].len() == 2
        && parts[2].len() == 2
        && parts.iter().all(|p| p.chars().all(|c| c.is_ascii_digit()))
}

fn sanitize_content(content: &str) -> Option<String> {
    let trimmed = content.replace(['\r', '\n'], " ").trim().to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

fn to_display(item: &TodoItem) -> DisplayTodo {
    DisplayTodo {
        id: item.id.clone(),
        content: item.content.clone(),
        status: item.status.clone(),
        sort_order: item.sort_order,
        created_at: item.created_at,
        batch_id: item.batch_id.clone(),
    }
}

fn sort_display(items: Vec<DisplayTodo>) -> Vec<DisplayTodo> {
    let mut sorted = items;
    sorted.sort_by(|a, b| {
        a.sort_order
            .cmp(&b.sort_order)
            .then(a.created_at.cmp(&b.created_at))
    });
    sorted
}

fn next_sort_order(store: &TodoDatabase) -> i64 {
    store
        .todos
        .iter()
        .filter(|t| t.deleted_at.is_none())
        .map(|t| t.sort_order)
        .max()
        .unwrap_or(-1)
        + 1
}

fn find_by_id<'a>(store: &'a TodoDatabase, id: &str) -> Option<&'a TodoItem> {
    store
        .todos
        .iter()
        .find(|t| t.id == id && t.deleted_at.is_none())
}

fn enumerate_date_range(start: &str, end: &str) -> Vec<String> {
    let mut dates = Vec::new();
    let mut current = start.to_string();
    while current.as_str() <= end {
        dates.push(current.clone());
        current = add_days(&current, 1);
    }
    dates
}

fn add_days(date: &str, delta: i64) -> String {
    let parts: Vec<i32> = date.split('-').map(|p| p.parse().unwrap_or(0)).collect();
    if parts.len() != 3 {
        return date.to_string();
    }
    // 단순 날짜 계산 (NaiveDate 없이)
    let epoch_days = days_since_epoch(parts[0], parts[1] as u32, parts[2] as u32);
    let new_days = epoch_days + delta;
    epoch_days_to_date(new_days)
}

fn days_since_epoch(year: i32, month: u32, day: u32) -> i64 {
    // 율리우스력 기반 간단 계산
    let y = year as i64;
    let m = month as i64;
    let d = day as i64;
    let a = (14 - m) / 12;
    let yr = y + 4800 - a;
    let mo = m + 12 * a - 3;
    let jdn = d + (153 * mo + 2) / 5 + 365 * yr + yr / 4 - yr / 100 + yr / 400 - 32045;
    // epoch(1970-01-01) 의 JDN
    let epoch_jdn: i64 = 2440588;
    jdn - epoch_jdn
}

fn epoch_days_to_date(days: i64) -> String {
    let jdn = days + 2440588;
    let a = jdn + 32044;
    let b = (4 * a + 3) / 146097;
    let c = a - 146097 * b / 4;
    let d = (4 * c + 3) / 1461;
    let e = c - 1461 * d / 4;
    let m = (5 * e + 2) / 153;
    let day = e - (153 * m + 2) / 5 + 1;
    let month = m + 3 - 12 * (m / 10);
    let year = 100 * b + d - 4800 + m / 10;
    format!("{:04}-{:02}-{:02}", year, month, day)
}

fn get_month_date_range(year_month: &str) -> (String, String) {
    let parts: Vec<i32> = year_month
        .split('-')
        .map(|p| p.parse().unwrap_or(0))
        .collect();
    let year = parts.first().copied().unwrap_or(2024);
    let month = parts.get(1).copied().unwrap_or(1);
    let last_day = {
        let next_month = if month == 12 { 1 } else { month + 1 };
        let next_year = if month == 12 { year + 1 } else { year };
        let first_next = format!("{:04}-{:02}-01", next_year, next_month);
        let d = add_days(&first_next, -1);
        d[8..10].parse::<u32>().unwrap_or(28)
    };
    (
        format!("{}-01", year_month),
        format!("{}-{:02}", year_month, last_day),
    )
}

// ─── Tauri 커맨드 ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_todos_by_date(app: AppHandle, target_date: String) -> Result<Vec<DisplayTodo>, String> {
    let store = read_store(&app);
    let items: Vec<DisplayTodo> = store
        .todos
        .iter()
        .filter(|t| t.target_date == target_date && t.deleted_at.is_none())
        .map(to_display)
        .collect();
    Ok(sort_display(items))
}

#[tauri::command]
pub fn get_month_summary(app: AppHandle, year_month: String) -> Result<Vec<DaySummary>, String> {
    let (start, end) = get_month_date_range(&year_month);
    let dates = enumerate_date_range(&start, &end);
    let store = read_store(&app);

    let summaries = dates
        .iter()
        .map(|date| {
            let items: Vec<DisplayTodo> = store
                .todos
                .iter()
                .filter(|t| &t.target_date == date && t.deleted_at.is_none())
                .map(to_display)
                .collect();
            let day = date[8..10].parse::<u32>().unwrap_or(0);
            DaySummary {
                date: date.clone(),
                day,
                todos: sort_display(items),
            }
        })
        .collect();

    Ok(summaries)
}

#[tauri::command]
pub fn create_todo(
    app: AppHandle,
    content: String,
    target_date: String,
) -> Result<TodoItem, String> {
    let content = sanitize_content(&content).ok_or("내용이 비어있습니다")?;
    if !is_valid_date(&target_date) {
        return Err("날짜 형식이 올바르지 않습니다".into());
    }

    let now = now_ms();
    let mut new_item = TodoItem {
        id: new_id(),
        content,
        target_date,
        status: "pending".into(),
        created_at: now,
        updated_at: now,
        sort_order: 0,
        batch_id: None,
        deleted_at: None,
    };

    mutate_store(&app, |store| {
        new_item.sort_order = next_sort_order(store);
        store.todos.push(new_item.clone());
    });

    Ok(new_item)
}

#[tauri::command]
pub fn create_todo_range(
    app: AppHandle,
    content: String,
    start_date: String,
    end_date: String,
) -> Result<(usize, String), String> {
    let content = sanitize_content(&content).ok_or("내용이 비어있습니다")?;
    if !is_valid_date(&start_date) || !is_valid_date(&end_date) {
        return Err("날짜 형식이 올바르지 않습니다".into());
    }
    if start_date > end_date {
        return Err("시작일은 종료일보다 늦을 수 없습니다".into());
    }

    let dates = enumerate_date_range(&start_date, &end_date);
    let batch_id = new_batch_id();
    let count = dates.len();

    mutate_store(&app, |store| {
        let base_order = next_sort_order(store);
        let now = now_ms();
        for (i, date) in dates.iter().enumerate() {
            store.todos.push(TodoItem {
                id: new_id(),
                content: content.clone(),
                target_date: date.clone(),
                status: "pending".into(),
                created_at: now,
                updated_at: now,
                sort_order: base_order + i as i64,
                batch_id: Some(batch_id.clone()),
                deleted_at: None,
            });
        }
    });

    Ok((count, batch_id))
}

#[tauri::command]
pub fn create_todo_month(
    app: AppHandle,
    content: String,
    year_month: String,
) -> Result<(usize, String), String> {
    let (start, end) = get_month_date_range(&year_month);
    create_todo_range(app, content, start, end)
}

#[tauri::command]
pub fn toggle_completion(app: AppHandle, todo_id: String) -> Result<bool, String> {
    let mut changed = false;
    mutate_store(&app, |store| {
        if let Some(item) = store
            .todos
            .iter_mut()
            .find(|t| t.id == todo_id && t.deleted_at.is_none())
        {
            match item.status.as_str() {
                "pending" => {
                    item.status = "completed".into();
                    item.updated_at = now_ms();
                    changed = true;
                }
                "completed" => {
                    item.status = "pending".into();
                    item.updated_at = now_ms();
                    changed = true;
                }
                _ => {}
            }
        }
    });
    Ok(changed)
}

#[tauri::command]
pub fn set_todo_status(app: AppHandle, id: String, status: String) -> Result<bool, String> {
    let mut changed = false;
    mutate_store(&app, |store| {
        if let Some(item) = store
            .todos
            .iter_mut()
            .find(|t| t.id == id && t.deleted_at.is_none())
        {
            if item.status != status {
                item.status = status.clone();
                item.updated_at = now_ms();
                changed = true;
            }
        }
    });
    Ok(changed)
}

#[tauri::command]
pub fn delete_todo(app: AppHandle, id: String, scope: String) -> Result<bool, String> {
    let mut changed = false;
    mutate_store(&app, |store| {
        let Some(item) = find_by_id(store, &id).cloned() else {
            return;
        };
        let now = now_ms();

        if scope == "batch" {
            if let Some(bid) = &item.batch_id {
                let bid = bid.clone();
                for t in store.todos.iter_mut() {
                    if t.batch_id.as_deref() == Some(bid.as_str()) && t.deleted_at.is_none() {
                        t.deleted_at = Some(now);
                        t.updated_at = now;
                        changed = true;
                    }
                }
                return;
            }
        }

        if let Some(t) = store
            .todos
            .iter_mut()
            .find(|t| t.id == id && t.deleted_at.is_none())
        {
            t.deleted_at = Some(now);
            t.updated_at = now;
            changed = true;
        }
    });
    Ok(changed)
}

#[tauri::command]
pub fn update_todo_content(app: AppHandle, id: String, content: String) -> Result<bool, String> {
    let content = sanitize_content(&content).ok_or("내용이 비어있습니다")?;
    let mut changed = false;

    mutate_store(&app, |store| {
        let batch_id = find_by_id(store, &id).and_then(|t| t.batch_id.clone());
        let now = now_ms();

        if let Some(bid) = batch_id {
            for t in store.todos.iter_mut() {
                if t.batch_id.as_deref() == Some(&bid) && t.deleted_at.is_none() {
                    t.content = content.clone();
                    t.updated_at = now;
                }
            }
            changed = true;
        } else if let Some(item) = store
            .todos
            .iter_mut()
            .find(|t| t.id == id && t.deleted_at.is_none())
        {
            item.content = content.clone();
            item.updated_at = now;
            changed = true;
        }
    });

    Ok(changed)
}

fn sibling_ids(store: &TodoDatabase, id: &str) -> Vec<String> {
    match find_by_id(store, id) {
        Some(item) => {
            if let Some(bid) = &item.batch_id {
                store
                    .todos
                    .iter()
                    .filter(|t| {
                        t.batch_id.as_deref() == Some(bid.as_str()) && t.deleted_at.is_none()
                    })
                    .map(|t| t.id.clone())
                    .collect()
            } else {
                vec![item.id.clone()]
            }
        }
        None => Vec::new(),
    }
}

#[tauri::command]
pub fn get_todo_span(app: AppHandle, id: String) -> Result<TodoSpan, String> {
    let store = read_store(&app);
    let item = find_by_id(&store, &id).ok_or("할 일을 찾을 수 없습니다")?;
    if let Some(bid) = &item.batch_id {
        let mut dates: Vec<String> = store
            .todos
            .iter()
            .filter(|t| t.batch_id.as_deref() == Some(bid.as_str()) && t.deleted_at.is_none())
            .map(|t| t.target_date.clone())
            .collect();
        dates.sort();
        let start = dates
            .first()
            .cloned()
            .unwrap_or_else(|| item.target_date.clone());
        let end = dates
            .last()
            .cloned()
            .unwrap_or_else(|| item.target_date.clone());
        Ok(TodoSpan {
            start_date: start,
            end_date: end,
        })
    } else {
        Ok(TodoSpan {
            start_date: item.target_date.clone(),
            end_date: item.target_date.clone(),
        })
    }
}

#[tauri::command]
pub fn update_todo(
    app: AppHandle,
    id: String,
    content: String,
    start_date: String,
    end_date: String,
) -> Result<bool, String> {
    let content = sanitize_content(&content).ok_or("내용이 비어있습니다")?;
    if !is_valid_date(&start_date) || !is_valid_date(&end_date) {
        return Err("날짜 형식이 올바르지 않습니다".into());
    }
    if start_date > end_date {
        return Err("시작일은 종료일보다 늦을 수 없습니다".into());
    }

    let store = read_store(&app);
    if find_by_id(&store, &id).is_none() {
        return Err("할 일을 찾을 수 없습니다".into());
    }

    let new_dates = enumerate_date_range(&start_date, &end_date);
    let mut changed = false;

    mutate_store(&app, |store| {
        let ids = sibling_ids(store, &id);
        if ids.is_empty() {
            return;
        }
        let id_set: HashSet<String> = ids.into_iter().collect();
        let now = now_ms();

        if new_dates.len() == 1 {
            let only = new_dates[0].clone();
            // 여러 날 중 남긴 하루만 빼고 나머지는 tombstone으로 표시한다.
            // (그냥 지우면 다른 기기에서 그 사이 고친 내용이 병합 때 되살아난다)
            for t in store.todos.iter_mut() {
                if id_set.contains(&t.id) && t.id != id {
                    t.deleted_at = Some(now);
                    t.updated_at = now;
                }
            }
            if let Some(item) = store.todos.iter_mut().find(|t| t.id == id) {
                item.content = content.clone();
                item.target_date = only;
                item.batch_id = None;
                item.updated_at = now;
                changed = true;
            }
            return;
        }

        let batch_id = find_by_id(store, &id)
            .and_then(|t| t.batch_id.clone())
            .unwrap_or_else(new_batch_id);

        let keep: HashSet<String> = new_dates.iter().cloned().collect();

        // 범위에서 빠진 날짜는 tombstone으로 표시(하드 삭제 대신).
        for t in store.todos.iter_mut() {
            if id_set.contains(&t.id) && !keep.contains(&t.target_date) {
                t.deleted_at = Some(now);
                t.updated_at = now;
            }
        }

        let mut have: HashSet<String> = HashSet::new();
        for t in store.todos.iter_mut() {
            if id_set.contains(&t.id) && t.deleted_at.is_none() {
                t.content = content.clone();
                t.batch_id = Some(batch_id.clone());
                t.updated_at = now;
                have.insert(t.target_date.clone());
            }
        }

        let base_order = next_sort_order(store);
        let mut add_i = 0i64;
        for date in &new_dates {
            if have.contains(date) {
                continue;
            }
            store.todos.push(TodoItem {
                id: new_id(),
                content: content.clone(),
                target_date: date.clone(),
                status: "pending".into(),
                created_at: now,
                updated_at: now,
                sort_order: base_order + add_i,
                batch_id: Some(batch_id.clone()),
                deleted_at: None,
            });
            add_i += 1;
        }
        changed = true;
    });

    Ok(changed)
}

#[tauri::command]
pub fn reorder_todo(
    app: AppHandle,
    target_date: String,
    id: String,
    over_id: String,
) -> Result<bool, String> {
    let store = read_store(&app);
    let display_list = {
        let items: Vec<DisplayTodo> = store
            .todos
            .iter()
            .filter(|t| t.target_date == target_date && t.deleted_at.is_none())
            .map(to_display)
            .collect();
        sort_display(items)
    };

    let from_index = display_list.iter().position(|t| t.id == id);
    let to_index = display_list.iter().position(|t| t.id == over_id);

    let (from_index, to_index) = match (from_index, to_index) {
        (Some(f), Some(t)) => (f, t),
        _ => return Ok(false),
    };

    if from_index == to_index {
        return Ok(true);
    }

    let mut reordered = display_list.clone();
    let moved = reordered.remove(from_index);
    reordered.insert(to_index, moved);

    let mut sort_orders: Vec<i64> = display_list.iter().map(|t| t.sort_order).collect();
    sort_orders.sort();

    mutate_store(&app, |store| {
        for (i, item) in reordered.iter().enumerate() {
            if let Some(t) = store.todos.iter_mut().find(|t| t.id == item.id) {
                t.sort_order = sort_orders[i];
            }
        }
    });

    Ok(true)
}

#[tauri::command]
pub fn get_store_path_str(app: AppHandle) -> String {
    crate::storage::get_store_path(&app)
        .to_string_lossy()
        .to_string()
}
