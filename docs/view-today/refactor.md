# View Today — useTodoStore 이관

> 범위: 오늘 탭만 · 레거시 `hooks/useTodos.ts` → `useTodoStore`

| 기능 | 상태 | 설명 |
|------|------|------|
| `loadTodosByDate` | ✅ | activeDate 기준 일별 목록 조회 |
| `reorderTodo` | ✅ | ↑↓ 순서 변경 (낙관적 갱신 + 실패 시 롤백) |
| `toggleCompletion` | ✅ | 아이콘·텍스트 클릭 — pending ↔ completed |
| `setTodoStatus` | ✅ | ⋮ 실패로 표시 / 다시 시도 (명시적 status 변경) |
| `deleteTodo` | ✅ | ⋮ 삭제 — day 낙관적 제거, batch 재조회 |
| `updateTodoContent` | ✅ | ⋮ 수정 — 단독 패치, 묶음 재조회 |
| `createTodo` | ✅ | 할 일 추가 — 하루 1건 |
| `createTodoRange` | ✅ | 할 일 추가 — 기간 일괄 |
| `createTodoMonth` | ✅ | 할 일 추가 — 한 달 일괄 |
| `TodoItemMenu` | ✅ | ⋮ 메뉴 UI (수정·복제·실패·삭제 진입점) |
| `openAddModalWithDuplicate` | ✅ | ⋮ 복제 → 추가 모달 내용 prefill |
| `DeleteConfirmModal` / `DeleteBatchModal` | ✅ | 삭제 확인 모달 (단독 / 묶음) — UIStore 직접 구독 |
| `EditTodoModal` | ✅ | ⋮ 수정 모달 — UIStore 직접 구독 |
| 빈 목록 UI | ✅ | 할 일 0건 안내 문구 |
| `TodayHeader` 건수 | ✅ | 「N건의 할 일」 표시 |
| `error` 표시 | ✅ | IPC 실패 시 App 상단 배너 (useTodoStore error 구독) |
| `App` 레거시 제거 | ✅ | useTodos 의존 제거, AddTodoModal props 제거 |
| 레거시 파일 삭제 | ✅ | components/TodoList.tsx, components/views/TodayView.tsx |

| 기능 | 상태 | 설명 |
|------|------|------|
| `monthSummary` | — | 월 탭 — 오늘 탭 범위 밖 |
| `refresh` | — | 설정 import — 오늘 탭 범위 밖 |
| `withTodoLock` | — | 연타 방지 — 필요 시 별도 |
