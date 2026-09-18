use std::collections::HashMap;

use crate::models::{MemoCategory, MemoItem, TodoDatabase, TodoItem};

/// 병합 대상 항목이 공통으로 가져야 하는 값.
/// `updated_at`으로 최신 쪽을 고르고, `is_deleted()`로 되살아나야 하는지
/// 판단한다.
trait Mergeable {
    fn merge_id(&self) -> &str;
    fn updated_at(&self) -> i64;
    fn is_deleted(&self) -> bool;
}

impl Mergeable for TodoItem {
    fn merge_id(&self) -> &str {
        &self.id
    }
    fn updated_at(&self) -> i64 {
        self.updated_at
    }
    fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }
}

impl Mergeable for MemoItem {
    fn merge_id(&self) -> &str {
        &self.id
    }
    fn updated_at(&self) -> i64 {
        self.updated_at
    }
    fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }
}

impl Mergeable for MemoCategory {
    fn merge_id(&self) -> &str {
        &self.id
    }
    fn updated_at(&self) -> i64 {
        self.updated_at
    }
    fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }
}

#[derive(Debug, Clone, Default)]
pub struct MergeSummary {
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
}

/// id가 같은 항목은 `updated_at`이 더 큰 쪽이 이긴다. 삭제(tombstone)도
/// 값이 바뀐 것과 똑같이 취급해서, 한쪽에서 지운 뒤 최신인 tombstone이
/// 다른 쪽의 옛 데이터를 이기면 되살아나지 않는다.
fn merge_entities<T>(local: Vec<T>, incoming: Vec<T>, summary: &mut MergeSummary) -> Vec<T>
where
    T: Mergeable,
{
    let mut by_id: HashMap<String, T> = local
        .into_iter()
        .map(|item| (item.merge_id().to_string(), item))
        .collect();

    for item in incoming {
        let key = item.merge_id().to_string();
        match by_id.get(&key) {
            None => {
                if !item.is_deleted() {
                    summary.added += 1;
                }
                by_id.insert(key, item);
            }
            Some(existing) => {
                if item.updated_at() > existing.updated_at() {
                    if item.is_deleted() && !existing.is_deleted() {
                        summary.deleted += 1;
                    } else if !item.is_deleted() {
                        summary.updated += 1;
                    }
                    by_id.insert(key, item);
                }
            }
        }
    }

    by_id.into_values().collect()
}

/// 로컬 데이터에 불러온 파일 내용을 합친다. 통째로 덮어쓰지 않고 항목
/// 단위로 최신 쪽만 채택하기 때문에, 서로 다른 기기에서 각자 만든 항목이
/// 둘 다 남고, 같은 항목을 양쪽에서 고쳤으면 더 최근에 고친 쪽이 남는다.
pub fn merge_database(local: TodoDatabase, incoming: TodoDatabase) -> (TodoDatabase, MergeSummary) {
    let mut summary = MergeSummary::default();

    let todos = merge_entities(local.todos, incoming.todos, &mut summary);
    let memos = merge_entities(local.memos, incoming.memos, &mut summary);
    let memo_categories = merge_entities(
        local.memo_categories,
        incoming.memo_categories,
        &mut summary,
    );

    let merged = TodoDatabase {
        todos,
        memos,
        memo_categories,
        last_exported_at: local.last_exported_at,
        last_imported_at: local.last_imported_at,
    };

    (merged, summary)
}
