use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodoItem {
    pub id: String,
    pub content: String,
    pub target_date: String,
    pub status: String, // "pending" | "completed" | "failed"
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
    pub sort_order: i64,
    pub batch_id: Option<String>,
    /// 하위항목이면 부모의 id, 기간 할 일이면 그 묶음 id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    /// 하위항목의 종료일. 없으면 `target_date` 하루만이다.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
    /// 삭제 시각(tombstone). 병합 시 다른 기기의 사본이 되살아나지 않도록
    /// 목록에서 바로 지우지 않고 표시만 해 둔다.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TodoDatabase {
    pub todos: Vec<TodoItem>,
    #[serde(default)]
    pub memos: Vec<MemoItem>,
    #[serde(default)]
    pub memo_categories: Vec<MemoCategory>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_exported_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_imported_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataTransferMeta {
    pub last_exported_at: Option<i64>,
    pub last_imported_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoCategory {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoItem {
    pub id: String,
    pub category_id: String,
    pub title: String,
    pub note: String,
    pub created_at: i64,
    pub sort_order: i64,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayTodo {
    pub id: String,
    pub content: String,
    pub status: String,
    pub sort_order: i64,
    pub created_at: i64,
    pub batch_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    /// 부모(또는 기간 묶음)와 그 하위를 묶는 키.
    pub group_key: String,
    #[serde(default)]
    pub has_children: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaySummary {
    pub date: String,
    pub day: u32,
    pub todos: Vec<DisplayTodo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodoSpan {
    pub start_date: String,
    pub end_date: String,
    /// 하위항목이면 부모 기간. 그 안에서만 날짜를 고른다.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit_start: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit_end: Option<String>,
}
