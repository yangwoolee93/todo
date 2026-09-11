use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodoItem {
    pub id: i64,
    pub content: String,
    pub target_date: String,
    pub status: String, // "pending" | "completed" | "failed"
    pub created_at: i64,
    pub sort_order: i64,
    pub batch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TodoDatabase {
    pub todos: Vec<TodoItem>,
    pub memos: Vec<MemoItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoItem {
    pub id: i64,
    pub kind: String, // "routine" | "planned"
    pub title: String,
    pub note: String,
    pub created_at: i64,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayTodo {
    pub id: i64,
    pub content: String,
    pub status: String,
    pub sort_order: i64,
    pub created_at: i64,
    pub batch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaySummary {
    pub date: String,
    pub day: u32,
    pub todos: Vec<DisplayTodo>,
}
