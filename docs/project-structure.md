my-todo-app/
├── src/
│ ├── main/ # [Main Process] Electron 백엔드 영역
│ │ ├── index.ts # 메인 엔트리 (윈도우 생성, App 생명주기)
│ │ ├── ipcHandlers.ts # IPC 통신 이벤트 리스너 (DB CRUD 및 백업 로직)
│ │ └── database.ts # SQLite 또는 JSON 파일 시스템 I/O 제어
│ │
│ ├── preload/ # [Preload Script] 메인-렌더러 다리 역할
│ │ └── index.ts # contextBridge를 통한 안전한 IPC API 노출
│ │
│ └── renderer/ # [Renderer Process] React 프론트엔드 영역
│ ├── src/
│ │ ├── components/
│ │ │ ├── CalendarBar.tsx # 상단 가로 드래그 날짜 바
│ │ │ ├── TodoList.tsx # 중앙 일별 투두 리스트 (생성/체크)
│ │ │ └── MonthlyTable.tsx# 하단 특정 월 모아보기 표 (Read-Only)
│ │ │
│ │ ├── hooks/
│ │ │ └── useTodos.ts # window.api(IPC)를 호출하는 React Custom Hook
│ │ │
│ │ ├── App.tsx # 메인 레이아웃 및 활성 날짜 상태 관리
│ │ └── main.tsx # React 엔트리
│ └── index.html
│
├── package.json
└── vite.config.ts
