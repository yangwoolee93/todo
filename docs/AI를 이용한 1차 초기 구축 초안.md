# AI를 이용한 1차 초기 구축 초안

> `functional_specs.md`, `project-structure.md`, `process-flow.md`를 기준으로 AI(Cursor)가 구현한 **동작 가능한 MVP 골격** 요약 문서입니다.  
> **UI/UX 개편(Tailwind, 뷰 분리, 테마) 및 데이터 모델 단순화(`batch_id` 기반) 내용을 포함합니다.**

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 제품명 | 가로 스크롤형 데스크톱 투두 애플리케이션 |
| 플랫폼 | Windows Desktop (Electron + React + Vite) |
| 패키지명 | `my-todo-app` |
| 버전 | 0.1.0 (초안) |
| 저장 방식 | JSON 파일 (로컬 `userData` 경로) |
| 스타일 | Tailwind CSS v4 + 커스텀 컬러 팔레트 |
| 테마 | 밝은 모드 / 어두운 모드 / 자동(시스템) |
| 설계 원칙 | 모듈 분리, 함수별 한글 주석, 저장소 추상화 |

본 초안은 **완성품이 아닌 1차 MVP**입니다. DnD 순서 변경·날짜별 order(B안) 등은 이후 단계에서 개선합니다.

---

## 2. 실행 방법

```powershell
cd c:\dev\Github\private\todo
npm install   # 최초 1회 (tailwindcss 포함)
npm run dev   # 개발 모드 (Electron + Vite HMR)
```

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 + Electron 창 실행 |
| `npm run build` | 프로덕션 빌드 (`out/` 출력) |
| `npm run preview` | 빌드 결과 미리보기 |

---

## 3. 프로젝트 루트 구조

```
todo/
├── docs/                          # 설계·흐름·구축 문서
├── src/
│   ├── shared/                    # Main·Renderer 공통
│   ├── main/                      # Electron Main Process
│   ├── preload/                   # contextBridge API
│   └── renderer/                  # React UI
├── electron.vite.config.ts        # Electron-Vite + Tailwind 플러그인
├── package.json
├── tsconfig.json
├── tsconfig.node.json             # Main / Preload TypeScript
└── tsconfig.web.json              # Renderer TypeScript
```

---

## 4. UI/UX 구조 (개편 후)

한 화면에 모든 섹션을 노출하지 않고, **3개 뷰**로 분리합니다.

| 탭 | 컴포넌트 | 설명 |
|----|----------|------|
| **오늘** | `TodayView` | 오늘(또는 선택 일) 투두만 집중 표시. 편집(CRUD) 가능 |
| **월별** | `MonthBoard` | 해당 월 1~31일을 **가로 컬럼**으로 Read-Only 조회 |
| **설정** | `SettingsView` | 테마 선택 + JSON/SQL 백업 |

### 오늘 뷰 동작

- 기본 활성 날짜: **오늘**
- **‹ 전날 / 다음날 ›** — 하루 단위 이동
- **다른 날짜** — `DatePickerModal` + `CalendarBar`로 날짜 선택
- **오늘로** — 오늘이 아닌 날을 보고 있을 때만 표시
- `CalendarBar`는 메인 화면이 아닌 **날짜 선택 모달**에서만 사용

### 월별 뷰 동작

- **열 = 하루**, 열 안에서 투두는 세로 나열
- 가로 드래그 스크롤 (F-01과 동일한 조작감)
- 오늘 날짜 열은 accent 테두리·링으로 강조
- 클릭·체크·수정 **불가** (F-03 Read-Only)

### 설정 뷰

- **ThemeSelector** — 밝은 / 어두운 / 자동
- **BackupPanel** — JSON·SQL 내보내기, JSON 불러오기

### 투두 추가·편집 UX (간결 모델)

**추가:** `TodayView` 하단 **「+ 투두 추가」** → `AddTodoModal`

| 모달 탭 | 동작 |
|---------|------|
| **하루** | 특정 날짜 1건 (`batch_id` 없음) |
| **기간** | 시작~종료 각 날짜마다 1건, **같은 `batch_id`로 묶음** |
| **한 달** | 선택 월 1일~말일 매일 1건, **기간 일괄과 동일하게 `batch_id` 묶음** |

> 예전 「통합(전역) 투두」개념(`is_global`)은 **제거**했습니다.  
> 「한 달 전체에 같은 할 일」= **한 달 기간 일괄**과 동일합니다.

**수정:** 리스트 **수정** 버튼 → `EditTodoModal`  
- `batch_id` 있으면 **묶음 전체 내용 일괄 수정** (UI에 「통합」 표시 없음)

**삭제:**  
- 단독(`batch_id` 없음): 확인 후 **해당 1건 하드 삭제**  
- 묶음(`batch_id` 있음): `DeleteBatchModal` — **전체 삭제** / **해당 날짜만 삭제**

**체크:** 해당 날짜 레코드만 토글 (묶음이어도 날마다 독립)

---

## 5. 소스 디렉터리 구조 (읽는 순서 추천)

```
src/
├── shared/                              # ① 공통 계약 (타입·IPC 채널)
│   ├── types/todo.ts                    #    TodoItem, DisplayTodo, 페이로드 타입
│   ├── ipc/channels.ts                  #    IPC 채널 이름 상수
│   └── utils/dateRange.ts               #    기간·한 달 날짜 계산
│
├── main/                                # ② 백엔드 (저장·비즈니스·IPC)
│   ├── index.ts                         #    앱 시작, 저장소 마이그레이션, 윈도우 생성
│   ├── ipcHandlers.ts                   #    IPC 요청 → repository/export 연결
│   └── database/
│       ├── storage.ts                   #    JSON 파일 읽기/쓰기 (저장소 1층)
│       ├── todoRepository.ts            #    CRUD·batch_id·정렬 (핵심 로직)
│       └── exportService.ts             #    JSON/SQL 익스포트, JSON 임포트
│
├── preload/                             # ③ Main ↔ Renderer 다리
│   └── index.ts                         #    window.api 노출
│
└── renderer/src/                        # ④ 프론트엔드 (React)
    ├── App.tsx                          #    뷰 전환, activeDate·테마 상태
    ├── types/views.ts                   #    AppView 타입 ('today' | 'month' | 'settings')
    ├── hooks/
    │   ├── useTodos.ts                  #    IPC 호출 + React 상태
    │   └── useTheme.ts                  #    밝음/어두움/자동 테마
    ├── utils/dateUtils.ts               #    날짜 포맷, 월·일 이동, isToday 등
    ├── styles/index.css                 #    Tailwind + 컬러 팔레트 + 공통 컴포넌트 클래스
    ├── components/
    │   ├── layout/AppShell.tsx          #    상단 탭 네비 + 레이아웃
    │   ├── views/
    │   │   ├── TodayView.tsx            #    오늘 메인 뷰
    │   │   ├── MonthBoard.tsx           #    가로 월별 모아보기 (F-03)
    │   │   └── SettingsView.tsx         #    테마 + 백업
    │   ├── CalendarBar.tsx              #    F-01 가로 캘린더 (모달용)
    │   ├── DatePickerModal.tsx          #    다른 날짜 선택
    │   ├── AddTodoModal.tsx             #    투두 추가 (하루/기간/한 달)
    │   ├── EditTodoModal.tsx            #    내용 수정 (묶음 일괄)
    │   ├── DeleteBatchModal.tsx         #    묶음 삭제 확인
    │   ├── TodoList.tsx                 #    F-02 리스트 (체크·수정·삭제·순서)
    │   ├── ThemeSelector.tsx            #    테마 선택
    │   └── BackupPanel.tsx              #    F-04 백업 버튼
    └── main.tsx                         #    React 엔트리
```

> **삭제·대체된 파일:** `MonthlyTable.tsx`(→ `MonthBoard.tsx`), `styles/app.css`(→ `styles/index.css`)

### 모듈별 역할 요약

| 모듈 | 역할 | 수정 시점 |
|------|------|-----------|
| `shared/types/todo.ts` | 데이터·IPC DTO 타입 정의 | 필드 추가/변경 시 |
| `shared/ipc/channels.ts` | IPC 채널명 상수 | API 추가 시 |
| `main/database/storage.ts` | JSON 파일 I/O | JSON → DB 교체 시 **1순위** |
| `main/database/todoRepository.ts` | 투두 CRUD·batch_id·일괄 수정/삭제 | 비즈니스 규칙 변경 시 **핵심** |
| `main/database/exportService.ts` | 백업·복원 | 익스포트 형식 추가 시 |
| `main/ipcHandlers.ts` | IPC ↔ 도메인 연결 | API 엔드포인트 추가 시 |
| `preload/index.ts` | `window.api` 노출 | IPC 메서드 추가 시 |
| `renderer/App.tsx` | 뷰 전환·전역 UI 상태 | 화면 흐름 변경 시 |
| `renderer/hooks/useTodos.ts` | UI ↔ IPC 연동 | 데이터 호출 패턴 변경 시 |
| `renderer/hooks/useTheme.ts` | 테마 모드·dark 클래스 적용 | 테마 동작 변경 시 |
| `renderer/styles/index.css` | 팔레트·Tailwind·공통 UI 클래스 | 색·타이포·간격 조정 시 |
| `renderer/components/views/*` | 화면별 UI | UX 개선 시 **주요 수정 위치** |

---

## 6. 구현된 기능

### F-01: 가로 드래그 캘린더 바 (`CalendarBar.tsx`)

- 선택 월의 일자를 가로 1행으로 표시
- 마우스 드래그로 좌우 스크롤
- 일자 클릭 → 활성 날짜 설정
- ◀ ▶ 버튼으로 이전/다음 월 이동
- **표시 위치:** `DatePickerModal` (「다른 날짜」 버튼)

### F-02: 일별 투두 리스트 (`TodoList` + `TodayView` + `AddTodoModal`)

- **오늘** 탭에서만 표시·편집
- **「+ 투두 추가」** 모달 — 하루 / 기간 / 한 달
- 체크·수정·삭제·**↑↓** 순서 변경
- 묶음 삭제 시 전체/해당일 선택 (`DeleteBatchModal`)
- 묶음 수정 시 내용 일괄 반영 (`EditTodoModal`)
- 사용자 UI에 「통합」 라벨 **없음**

### F-03: 월별 모아보기 (`MonthBoard.tsx`)

- **월별** 탭 전용, 메인 화면과 분리
- 1~31일을 **가로 컬럼**으로 배치 (기존 세로 테이블 대체)
- 가로 드래그 스크롤
- **Read-Only** — 클릭·수정·체크 불가
- 오늘 열 accent 강조

### F-04: 로컬 데이터 백업 (`BackupPanel` → `SettingsView`)

- **설정** 탭에서 접근
- JSON 내보내기 / SQL 내보내기 / JSON 불러오기(전체 교체)

### 추가: 테마 (설정 탭)

- **밝은 모드** — 항상 라이트 팔레트
- **어두운 모드** — `html.dark` 클래스 + 다크 팔레트
- **자동** — `prefers-color-scheme` 연동, OS 테마 변경 시 실시간 반영
- 선택값 `localStorage` 키: `todo-theme-mode`

---

## 7. 스타일 · 컬러 팔레트

파일: `src/renderer/src/styles/index.css`

Tailwind CSS v4 (`@import 'tailwindcss'`) + `@tailwindcss/vite` 플러그인 사용.

### 팔레트 토큰 (Tailwind 유틸 예: `bg-base`, `text-fg`, `border-border`)

| 토큰 | 용도 |
|------|------|
| `base` | 페이지 배경 |
| `surface` | 카드·입력 필드 배경 |
| `muted` | hover·보조 배경 |
| `fg` / `fg-secondary` / `fg-muted` | 본문·보조·힌트 텍스트 |
| `accent` / `accent-hover` / `accent-soft` | 강조·버튼·오늘 표시 |
| `border` / `border-strong` | 테두리 |
| `danger` / `danger-soft` | 오류·삭제 |
| `success` | 완료 등 (예비) |
| `today-ring` | 오늘 열 링 색 |

라이트 값은 `@theme` 블록, 다크 값은 `.dark { ... }` 에서 동일 변수명으로 오버라이드.

### 공통 컴포넌트 클래스

| 클래스 | 용도 |
|--------|------|
| `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-danger` | 버튼 |
| `.input` | 텍스트 입력 |
| `.card` | 섹션 카드 |
| `.badge` | (예비) 강조 라벨 |
| `.nav-tab` / `.nav-tab-active` | 상단 탭 |
| `.scroll-x-drag` | 가로 드래그 스크롤 영역 |

색감 변경 시 **`index.css`의 `@theme` / `.dark`만** 수정하면 앱 전체에 반영됩니다.

---

## 8. 데이터 모델 (단순화)

### 8.1 설계 원칙

- **모든 투두는 특정 날짜(`target_date`)에 1:1로 표시**
- **다중 날짜 추가 = 기간(또는 한 달) 일괄** → 날마다 레코드 N건 + **`batch_id`로 묶음**
- ~~`is_global` / `source_id` / 예외 복사본~~ → **제거** (기획 단순화)
- 삭제: **하드 삭제** (소프트 삭제는 추후)

### 8.2 TodoItem

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `number` | 고유 ID |
| `content` | `string` | 1줄 투두 내용 |
| `target_date` | `string` | `"YYYY-MM-DD"` |
| `is_completed` | `boolean` | 완료(체크) |
| `created_at` | `number` | 생성 시각(ms) |
| `sort_order` | `number` | 표시 순서 |
| `batch_id` | `string \| null` | 일괄 추가 묶음 ID — `null`이면 하루 단독 |

### 8.3 JSON 저장

- 경로: `app.getPath('userData')` + `todos.json`
- 구조: `{ "todos": [ TodoItem, ... ] }`
- 앱 시작 시 `ensureNormalizedStore()` — 구 스키마(`is_global` 등) 항목은 **마이그레이션·제외**

### 8.4 비즈니스 규칙 (`todoRepository.ts`)

**조회 (날짜 D):** `target_date === D` 필터 → `sort_order` → `created_at` 정렬

**생성**

| API | 결과 |
|-----|------|
| `createTodo` | 1건, `batch_id: null` |
| `createTodosInRange` | 기간 내 N건, 공통 `batch_id` |
| `createTodosForMonth` | 해당 월 1~말일 N건, 공통 `batch_id` |

**수정:** `updateTodoContent(id, content)` — `batch_id` 있으면 **묶음 전체** content 변경

**삭제:** `deleteTodo(id, scope)`

| scope | 동작 |
|-------|------|
| `day` | 해당 `id` 1건 제거 |
| `batch` | 같은 `batch_id` 전부 제거 |

**체크:** `toggleComplete(id)` — 해당 레코드만

**순서:** 인접 항목 `sort_order` 교환 (↑↓)

---

## 9. IPC API (`window.api`)

채널 상수: `src/shared/ipc/channels.ts`  
노출 위치: `src/preload/index.ts` → `window.api`

| 메서드 | 설명 |
|--------|------|
| `getTodosByDate(date)` | 특정 날짜 투두 목록 |
| `getMonthSummary(yearMonth)` | 월별 일자 요약 |
| `createTodo(payload)` | 하루 1건 추가 |
| `createTodoRange(payload)` | 기간 일괄 추가 |
| `createTodoMonth(payload)` | 한 달 일괄 추가 |
| `toggleComplete(id)` | 완료 토글 |
| `deleteTodo({ id, scope })` | 삭제 (`day` / `batch`) |
| `updateTodoContent({ id, content })` | 내용 수정 (묶음 일괄) |
| `reorderTodo(payload)` | 순서 변경 (↑↓) |
| `exportJson()` / `exportSql()` / `importJson()` | 백업·복원 |

### 데이터 흐름 (요약)

```
Renderer (App → useTodos / views)
    ↓ window.api
Preload (contextBridge)
    ↓ ipcRenderer.invoke
Main (ipcHandlers.ts)
    ↓
database/ (storage · todoRepository · exportService)
    ↓
todos.json
```

`useTodos`는 `activeDate`(일별 조회)와 `summaryMonth`(월별 요약, 선택)를 받습니다. 월별 탭에서는 `monthYearMonth` 상태를 `summaryMonth`로 전달합니다.

상세 흐름도는 `process-flow.md`의 Mermaid 다이어그램을 참고하세요.

---

## 10. 기술 스택

| 구분 | 선택 |
|------|------|
| 데스크톱 | Electron 34 |
| UI | React 19 |
| 스타일 | Tailwind CSS 4 (`@tailwindcss/vite`) |
| 빌드 | electron-vite 3, Vite, TypeScript 5.7 |
| 저장 | JSON 파일 (추후 SQLite/MongoDB 교체 가능) |

---

## 11. 저장소 교체 가이드 (JSON → DB)

나중에 DB로 전환할 때 수정 범위를 최소화하려면:

1. **`storage.ts`** — 파일 I/O를 DB 클라이언트 호출로 교체
2. **`todoRepository.ts`** — 공개 함수 시그니처(`getTodosByDate`, `createTodo` 등) **유지**
3. **`ipcHandlers.ts` / `preload/index.ts` / Renderer** — 변경 최소화
4. **임포트/익스포트** — `exportService.ts`에서 형식(JSON/SQL)만 유지하면 이관 경로 동일

UI 개편 후에도 **Main·IPC·저장소 계층은 동일**하며, Renderer만 뷰/스타일이 분리되어 있습니다.

---

## 12. 2차 이후 개선 후보

| 항목 | 현재 상태 | 개선 방향 |
|------|-----------|-----------|
| 순서 변경 | ↑↓ 화살표 | DnD UI |
| 날짜별 order | 전역 `sort_order` | `dayOrder` (B안) |
| 삭제 | 하드 삭제 | 필요 시 소프트 삭제 |
| 월별 보드 | Read-Only 가로 컬럼 | 열 너비·접기 |
| 패키징 | dev/build만 | Windows `.exe` |
| 테스트 | 없음 | repository 단위 테스트 |
| `functional_specs.md` | 구 `is_global` 스펙 | 본 문서 §8 기준으로 추후 갱신 |

**이미 반영된 항목**

- ~~한 화면 4섹션~~ → **오늘 / 월별 / 설정** 뷰 분리
- ~~세로 월별 표~~ → **가로 컬럼** `MonthBoard`
- ~~Tailwind 미적용~~ → **Tailwind + 테마**
- ~~`is_global`·통합 UI~~ → **`batch_id` 기간/한 달 일괄**
- ~~인라인 추가 폼~~ → **`AddTodoModal` (하루/기간/한 달)**
- ~~소프트 삭제~~ → **하드 삭제**

---

## 13. 관련 문서

| 문서 | 역할 |
|------|------|
| `functional_specs.md` | 기능·데이터·제약 **요구사항** |
| `project-structure.md` | 초기 설계 **폴더 구조** (Renderer 일부는 본 문서 §5 기준) |
| `process-flow.md` | IPC·DB **프로세스 흐름도** (Mermaid) |
| **본 문서** | AI 1차 구축 + **UI/UX 개편** 실제 구현 현황 |

---

## 14. 주석·코딩 컨벤션

- 각 파일·함수에 **한글 JSDoc 주석**을 달아 두었습니다.
- IPC 채널명·타입은 `shared/`에 모아 **한 곳만 수정**하면 되도록 구성했습니다.
- Renderer는 **뷰(`views/`) · 레이아웃 · 훅 · 스타일**로 분리했습니다.
- 비즈니스 로직은 Main `todoRepository.ts`에 집중, UI는 Tailwind 유틸 + `index.css` 공통 클래스를 사용합니다.

---

*작성 기준: 1차 AI 초안 + UI/UX 개편 + `batch_id` 데이터 모델 단순화 반영*
