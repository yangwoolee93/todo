# zustand를 이용한 store 사용

```
// 설치
pnpm add zustand
```

```
// 보일러 플레이트
import { create } from "zustand";
import type { AppView } from "@renderer/types/views";

interface UIState {
  view: AppView;
  setView: (view: AppView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: "today",
  setView: (view) => set({ view }),
}));
```

```
// 호출법
// 값 + 액션 같이 (모든 상태 변경 시 리렌더)
const { view, setView } = useUIStore();

// selector — 리렌더 범위 좁히기 (권장)
const view = useUIStore((s) => s.view);
const setView = useUIStore((s) => s.setView);
```

기타

- redux devtools를 그대로 사용 가능한 패턴 존재
- ipc 호출시 추가 작업없이 async로 호출 가능
