# [임시] 월별 타임라인 메모

> 작성 시점 기준 워크스페이스 실파일 조사.  
> 목적: 리팩터·UI/UX 개선 후보를 잠깐 모아 두기. 정식 스펙이 아님.  
> 정리 후 삭제하거나 `functional_specs` / 로드맵으로 이관하면 됨.

---

## 1. 현재 파일 구조 (실측)

`src/renderer/src/features/month/ui/` 디렉터리:

| 파일 | 역할 |
|------|------|
| `MonthBoard.tsx` | 월 선택, 「오늘로」, 보기 모드 토글, dayViewProps 전달 |
| `MonthColumnsView.tsx` | 열 보기 |
| `MonthTimelineView.tsx` | 타임라인 보기 |
| `MonthViewToggle.tsx` | columns / timeline 전환 |
| `monthViewTypes.ts` | `MonthDayViewProps` 공유 타입 |

관련:

- `model/useMonthStore.ts` — `yearMonth`, `viewMode`(기본 `"timeline"`), `summaries`, load
- `pages/month/MonthPage.tsx` — `MonthBoard`만 렌더

**없음 (삭제됨 / 미사용):** `buildTimelineBars.ts`, `MonthTimelineView copy.tsx` — 디렉터리에 없음. 코드에서 import도 없음.

---

## 2. 동작 개요 (타임라인)

### 데이터

- 입력: `summaries: DaySummary[]` (날짜별 `todos`)
- batch 병합·막대 span 변환 **없음**. 날짜 → 그날 todos를 행으로 펼침.

### 레이아웃

- `dayWidth = 88`, `trackWidth = summaries.length * dayWidth`
- sticky 헤더: 날짜 칸을 `absolute` + `left: index * dayWidth`로 배치 (`div` + `role="button"`)
- 본문: 각 todo 행, `marginLeft: dayIndex * dayWidth`, 박스 `maxWidth: dayWidth - 8`
- 오늘/선택 열: 본문에 absolute 세로 배경 1회

### 「오늘로」 스크롤 (`MonthBoard` → `scrollToTodayTick`)

`MonthTimelineView.scrollToToday`:

1. 가로: `scrollRef.scrollLeft`로 오늘 칸 중앙
2. 세로: 오늘 **첫 할 일 행**(`todayRowRef`) → `scrollIntoView({ block: "center" })`
3. 오늘 할 일 없으면: `todayHeaderRef`만 (`block: "nearest"`)

`MonthBoard` 마운트 시 tick +1, 「오늘로」 클릭 시에도 tick +1. 기본 `viewMode`는 `"timeline"`.

### 선택 → 오늘 탭

- 날짜/할 일 클릭 → `selectedDate` 토글
- 하단 버튼 「{날짜} — 오늘 탭으로 이동」 → `setActiveDate` + `goTodayView`

---

## 3. 열 보기와의 차이

| | Timeline | Columns |
|--|----------|---------|
| 구조 | 가로 날짜축 + todo 행 | 날짜 카드 열 |
| 이동 CTA | 하단 고정 바 | 칼럼 안 「이동」 |
| 할 일 글자 | `text-sm` | `text-xs` |
| 빈 날 | 행 없음 | 「—」 |
| 오늘 스크롤 | 가로+세로(첫 todo) | 칼럼 `scrollIntoView` |

---

## 4. 리팩터 후보

### 우선

1. **`scrollToToday` / `useEffect`**
   - `summaries` 변경 시 `scrollLeft = 0` 후 `scrollToToday()` → 달 전환마다 위치 리셋·오늘 점프(의도 확인 필요)
   - `scrollToTodayTick === 0` early return, effect deps에 `scrollToToday` 미포함 → 타이밍·lint 이슈 가능

2. **헤더 레이아웃**
   - `absolute` 좌표 대신 flex + 고정 너비(`shrink-0`)로 단순화 검토

3. **`dayWidth` / `dayWidth - 8`**
   - style 분산 → CSS 변수 또는 상수 한곳(패딩 포함 규칙 명시)

### 선택

4. 헤더·ColumnsView 키보드 핸들러 중복 → 작은 공유 헬퍼
5. 중첩 `map` → flat list(가독성용, 필수 아님)

---

## 5. UI/UX 개선 후보

### 높음

1. **긴 제목**: 박스 너비 고정 + `whitespace-nowrap` → 옆 날짜 위로 글자 겹침. 의도면 OK, 아니면 툴팁/클릭 영역 정리.
2. **이동 CTA**: Timeline 하단 vs Columns 칼럼 내 — 위치·카피 통일 검토.
3. **오늘 할 일 0건**: `todayRowRef` 없음 → 「오늘로」 세로가 약함. 빈 날 앵커 또는 헤더 세로 보정.
4. **헤더 `text-sm` + height 36**: 세로 여유 부족할 수 있음 → height/`py` 조정.

### 중간

5. 요일 표시(주말 구분)
6. 더블클릭/Enter로 선택 없이 바로 이동
7. 스크롤바 inset(`scrollbar-y-inset`) Windows 여백
8. 월 전환 시 스크롤 정책(리셋 vs 유지 vs 「오늘로」만)

### 낮음

9. sticky 헤더 오늘색 vs 본문 soft 배경 세로 연속성
10. 기간 막대 없음 → “타임라인” 차별점이 약함(열 보기와 역할 겹침). 제품 방향에 따라 유지/강화/통합.

---

## 6. 권장 작업 순서 (임시)

1. 스크롤 effect·월 변경 정책 정리  
2. 헤더 flex화 + dayWidth 규칙 정리  
3. UX: 이동 CTA / 긴 글자 / 오늘 빈 날 / 헤더 높이  

이 문서는 작업 끝나면 삭제하거나 스펙·로드맵에 흡수.
