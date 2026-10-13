# todo-app Design Document

> **Summary**: localStorage에 저장되는 개인용 할 일 웹앱의 구조·데이터 모델·모듈 인터페이스·UI·테스트 설계 (Option C: 실용 절충)
>
> **Project**: todo-app
> **Version**: 0.1.0 (pre-init)
> **Author**: biggsman
> **Date**: 2026-10-12
> **Status**: Draft
> **Planning Doc**: [todo-app.plan.md](../../01-plan/features/todo-app.plan.md)

### Pipeline References (if applicable)

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A — 본 문서 §3에서 정의 |
| Phase 2 | Coding Conventions | N/A — 본 문서 §10에서 정의 |
| Phase 3 | Mockup | N/A — 본 문서 §5 와이어프레임 |
| Phase 4 | API Spec | N/A — 서버 API 없음, §4는 모듈 인터페이스 |

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | 흩어진 할 일 때문에 마감·중요한 일을 놓치는 문제를, 가입 없이 바로 쓰는 정리 도구로 해결 |
| **WHO** | 개인 사용자 1인 (데스크톱·모바일 브라우저), 로그인·동기화 불필요 |
| **RISK** | localStorage 데이터 유실·손상 → JSON 백업/가져오기, 손상 감지 시 백업 후 복구로 대응 |
| **SUCCESS** | FR-01~FR-14 구현, 도메인 로직 테스트 커버리지 ≥ 80%, 린트 0·빌드 성공, 모바일(360px)·다크 모드 정상 |
| **SCOPE** | 1) 핵심 CRUD + 저장 → 2) 마감일·우선순위·정렬 → 3) 필터·검색·카테고리·태그 → 4) 다크 모드·Undo·백업·복구 |

---

## 1. Overview

### 1.1 Design Goals

- 비즈니스 규칙(정렬·필터·검증·마감 상태)을 React·브라우저 API와 분리해 순수 함수로 테스트한다.
- 저장소 접근은 `storage/` 한 곳에 모아, 손상 복구·스키마 버전·가져오기 검증을 한 군데서 책임진다.
- 상태 변경은 하나의 리듀서로 모아 예측 가능하게 하고, 저장은 상태 변경 후 자동으로 일어나게 한다.
- 추가 런타임 의존성 없이 React만으로 구현한다 (번들 작게, 유지보수 쉽게).

### 1.2 Design Principles

- **의존성은 안쪽으로**: `components → state → domain`, `state → storage → domain`. `domain`은 아무것도 import하지 않는다.
- **경계에서 한 번 검증**: 사용자 입력은 `domain/validate.ts`, 저장·가져오기 데이터는 `storage/schema.ts`에서 검증한다. 안쪽은 검증된 값을 믿는다.
- **실패는 값으로**: 저장소·가져오기 오류는 예외 대신 `Result` 타입으로 반환하고, UI가 토스트로 안내한다.
- **YAGNI**: 저장소 인터페이스(포트)·DI 컨테이너는 만들지 않는다. 대신 `storage` 함수는 `Storage` 객체를 인자로 받아 테스트에서 가짜를 주입할 수 있게 한다.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | `App.tsx` + `useTodos` 훅에 로직·저장 집중 | domain / application(usecases, ports) / infrastructure / presentation + DI | domain(순수 함수) / storage / state(리듀서) / components |
| **New Files** | ~8 | ~32 | ~22 (+ 테스트) |
| **Modified Files** | 0 | 0 | 0 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | 기능 14개가 한 훅에 엉킴, 테스트 80% 어려움 | 개인용 앱 대비 과설계 | Low (balanced) |
| **Recommendation** | Quick wins, hotfixes | Long-term projects | **Default choice** |

**Selected**: Option C — **Rationale**: 기능 수(14개)에 비해 관심사 분리가 필요하고 테스트 커버리지 80% 목표가 있지만, 서버 전환 계획이 없어 포트·DI 추상화는 비용만 늘린다. (2026-10-12 Checkpoint 3, 사용자 선택)

### 2.1 Component Diagram

```
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                 │
│  components/ (React UI)                                         │
│     │  dispatch(action) / useTodos()                            │
│     ▼                                                           │
│  state/ (TodoContext + todoReducer + useUndo)                   │
│     │  sortTodos / filterTodos / createTodo ...                 │
│     ├──────────────▶ domain/ (순수 함수, 타입)                   │
│     │  loadTodos / saveTodos / export / import                  │
│     ▼                                                           │
│  storage/ ─────────▶ window.localStorage                        │
│                                                                 │
│  theme/ (useTheme) ─▶ <html data-theme> + localStorage          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
입력 → validate(domain) → dispatch(action) → todoReducer → 새 todos 상태
     → useEffect: saveTodos(storage) → localStorage
     → 화면: filterTodos + sortTodos(domain) → TodoList 렌더

앱 시작: loadTodos(storage) → schema 검증
        ├─ 정상 → 초기 상태
        └─ 손상 → corrupt-backup 키에 원본 보관 → 빈 상태 + 안내 토스트
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| components/* | state, domain(타입·표시용 함수) | UI 렌더, 사용자 입력 |
| state/todoReducer | domain | 상태 전이 |
| state/TodoContext | state/todoReducer, storage | 초기 로드, 자동 저장, Provider |
| storage/* | domain(타입·검증) | localStorage 입출력, 스키마 검증, JSON 백업 |
| theme/useTheme | (브라우저 API) | 테마 결정·저장 |
| domain/* | 없음 | 비즈니스 규칙 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// domain/todo.ts
export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;               // crypto.randomUUID()
  title: string;            // 1~200자, 앞뒤 공백 제거
  completed: boolean;
  priority: Priority;       // 기본 'medium'
  dueDate: string | null;   // 'YYYY-MM-DD' (로컬 날짜, 시간 없음)
  category: string | null;  // 1~30자, 1개
  tags: string[];           // 소문자·공백 제거·중복 제거, 각 1~20자, 최대 10개
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  completedAt: string | null;
}

export type StatusFilter = 'all' | 'active' | 'completed';
export type SortKey = 'dueDate' | 'priority' | 'createdAt';
export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none';

export interface TodoQuery {
  status: StatusFilter;      // 기본 'all'
  text: string;              // 제목·태그 부분 일치, 대소문자 무시
  category: string | null;   // null = 전체
  tag: string | null;        // null = 전체
}

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
export interface AppError { code: ErrorCode; message: string }
```

### 3.2 Entity Relationships

```
[Todo] N ──── 0..1 [Category]   (문자열 값, 별도 엔티티 없음)
[Todo] N ──── N    [Tag]        (문자열 배열, 별도 엔티티 없음)
```
카테고리·태그 목록은 저장하지 않고 현재 todos에서 계산한다 (`collectCategories`, `collectTags`).

### 3.3 Storage Schema (localStorage)

| Key | Value | Description |
|-----|-------|-------------|
| `todo-app:v1` | `{ "schemaVersion": 1, "todos": Todo[] }` | 할 일 데이터 |
| `todo-app:theme` | `"light"` \| `"dark"` | 수동 선택 테마 (없으면 시스템 설정) |
| `todo-app:corrupt-backup` | 원본 문자열 | 손상 감지 시 원본 보관 (FR-14) |
| `todo-app:pre-import-backup` | `{ schemaVersion, todos }` | 가져오기 직전 자동 백업 (FR-13) |

**Export file** (`todo-app-backup-YYYY-MM-DD.json`):
```json
{ "app": "todo-app", "schemaVersion": 1, "exportedAt": "2026-10-12T09:00:00.000Z", "todos": [] }
```

---

## 4. Module Interface Specification

> 서버 API가 없으므로, 레이어 경계의 함수 시그니처를 계약(Contract)으로 정의한다. Gap 분석은 이 시그니처와 구현을 대조한다.

### 4.1 Interface List

| Module | Function | Description | FR |
|--------|----------|-------------|----|
| domain/validate | `validateTitle(raw: string): Result<string>` | 공백 제거 후 1~200자 검증 | FR-01, FR-03 |
| domain/validate | `normalizeTags(raw: string[]): Result<string[]>` | 소문자·trim·중복 제거, 개수·길이 검증 | FR-10 |
| domain/validate | `validateCategory(raw: string): Result<string \| null>` | 빈 값 → null, 1~30자 | FR-10 |
| domain/todo | `createTodo(input: NewTodoInput, now: Date, id: string): Result<Todo>` | 검증 후 새 Todo 생성 | FR-01, FR-06, FR-07 |
| domain/todo | `updateTodo(todo: Todo, patch: TodoPatch, now: Date): Result<Todo>` | 수정 + updatedAt 갱신 | FR-03 |
| domain/todo | `toggleTodo(todo: Todo, now: Date): Todo` | completed·completedAt 전환 | FR-02 |
| domain/todo | `getDueStatus(todo: Todo, today: string): DueStatus` | 마감 상태 (완료 항목은 'none') | FR-06 |
| domain/sort | `sortTodos(todos: Todo[], key: SortKey): Todo[]` | 새 배열 반환, 안정 정렬, 마감일 없음은 뒤로, 동률은 createdAt 내림차순. `dueDate`·`priority` 정렬에서는 미완료 → 완료 순으로 먼저 나눈다 (v0.2) | FR-08 |
| domain/filter | `filterTodos(todos: Todo[], query: TodoQuery): Todo[]` | 상태·텍스트·카테고리·태그 AND 조합 | FR-09, FR-10 |
| domain/filter | `collectCategories(todos)`, `collectTags(todos)` | 사용 중인 값 목록(정렬됨) | FR-10 |
| storage/schema | `parseStoredData(raw: unknown): Result<Todo[]>` | 스키마 버전·필드 검증 | FR-14 |
| storage/todoStorage | `loadTodos(storage: Storage): { todos: Todo[]; recovered: boolean }` | 없음 → 빈 배열, 손상 → 백업 후 빈 배열 + recovered=true | FR-05, FR-14 |
| storage/todoStorage | `saveTodos(storage: Storage, todos: Todo[]): Result<void>` | 용량 초과 시 STORAGE_QUOTA | FR-05 |
| storage/backup | `exportTodos(todos: Todo[], now: Date): { filename: string; json: string }` | 내보내기 파일 내용 | FR-13 |
| storage/backup | `parseImportFile(text: string): Result<Todo[]>` | JSON 파싱·app·schemaVersion·Todo 검증 | FR-13 |
| storage/backup | `backupBeforeImport(storage: Storage, todos: Todo[]): Result<void>` | 가져오기 직전 백업. 실패하면 가져오기를 중단하고 안내 (v0.2) | FR-13 |
| state/todoReducer | `todoReducer(state: TodoState, action: TodoAction): TodoState` | 아래 4.2 액션 처리 | FR-01~04, 12, 13 |
| state/useUndo | `useUndo(): { pending, offer(removed), undo(), dismiss() }` | 5초 되돌리기 | FR-12 |
| theme/useTheme | `useTheme(): { theme, toggle() }` | 시스템 기본, 수동 선택 저장 | FR-11 |

### 4.2 Detailed Specification

#### `TodoAction` (state/todoReducer)

```typescript
type TodoAction =
  | { type: 'add'; todo: Todo }                       // 검증은 dispatch 전에 domain에서
  | { type: 'update'; todo: Todo }
  | { type: 'toggle'; id: string; now: string }
  | { type: 'remove'; id: string }
  | { type: 'clearCompleted' }
  | { type: 'restore'; items: { todo: Todo; index: number }[] }  // Undo
  | { type: 'replaceAll'; todos: Todo[] };            // 가져오기

interface TodoState { todos: Todo[] }
```

- `remove`·`clearCompleted`는 상태에서 제거만 하고, 제거된 항목과 원래 위치는 호출 측(`useTodoActions`)이 `useUndo.offer()`에 넘긴다.
- `restore`는 원래 index 순서대로 다시 끼워 넣는다 (id 중복 시 무시).
- 알 수 없는 id에 대한 `update`/`toggle`/`remove`는 상태를 그대로 반환한다.

#### `parseImportFile(text)`

- 입력: 파일 텍스트 (5MB 초과 파일은 UI에서 먼저 거부)
- 성공: `{ ok: true, value: Todo[] }`
- 실패:
  - `IMPORT_INVALID_JSON`: JSON 파싱 실패
  - `IMPORT_SCHEMA_MISMATCH`: `app !== 'todo-app'` 또는 지원하지 않는 schemaVersion 또는 Todo 필드 오류 (첫 오류 위치 포함)

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
데스크톱 (≥ 768px)                         모바일 (360px)
┌──────────────────────────────────────┐  ┌────────────────────┐
│ Todo            [⤓ 데이터] [☾ 테마]   │  │ Todo     [⋯] [☾]   │
├──────────────────────────────────────┤  ├────────────────────┤
│ [할 일 입력.................] [추가]  │  │ [할 일 입력...][+] │
│  ▸ 마감일 · 우선순위 · 카테고리 · 태그 │  │  ▸ 세부 옵션       │
├──────────────────────────────────────┤  ├────────────────────┤
│ (전체|진행 중|완료) [🔍 검색....]     │  │ (전체|진행|완료)   │
│ 카테고리[▾] 태그[▾] 정렬[마감일순 ▾]  │  │ [🔍 검색] [필터 ▾] │
├──────────────────────────────────────┤  ├────────────────────┤
│ ☐ 보고서 제출  ●높음  ⏰오늘  업무 #a │  │ ☐ 보고서 제출      │
│ ☐ 장보기       ●보통  10/14   개인    │  │   ●높음 ⏰오늘 업무│
│ ☑ 운동 (흐리게, 취소선)               │  │ ☑ 운동             │
├──────────────────────────────────────┤  ├────────────────────┤
│ 남은 일 2개        [완료 항목 삭제]   │  │ 2개 남음 [완료삭제]│
└──────────────────────────────────────┘  └────────────────────┘
          [삭제됨 · 되돌리기]  ← 하단 토스트 5초
```

### 5.2 User Flow

```
앱 열기 → (손상 시 안내 토스트) → 입력 후 Enter → 목록에 추가
       → 항목 클릭/Enter → 편집 모드 → Enter 저장 / Esc 취소
       → 체크 → 완료 / 삭제 → 토스트 [되돌리기]
       → 필터·검색·정렬로 보기 조정
       → 데이터 메뉴 → 내보내기(파일 다운로드) / 가져오기(파일 선택 → 검증 → 덮어쓰기 확인 → 교체)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `App` | src/App.tsx | 레이아웃, Provider 구성 |
| `Header` | src/components/Header.tsx | 제목, DataMenu, ThemeToggle |
| `TodoInput` | src/components/TodoInput.tsx | 새 할 일 입력 + 세부 옵션(접힘) |
| `TodoDetailsFields` | src/components/TodoDetailsFields.tsx | 마감일·우선순위·카테고리·태그 입력 묶음 (Input·Editor 공용) |
| `TagInput` | src/components/TagInput.tsx | 태그 칩 입력 (Enter/쉼표로 추가, Backspace로 삭제) |
| `FilterBar` | src/components/FilterBar.tsx | 상태 탭, 검색, 카테고리·태그 필터, SortSelect |
| `TodoList` | src/components/TodoList.tsx | filter+sort 결과 렌더, 빈 상태 메시지 |
| `TodoItem` | src/components/TodoItem.tsx | 체크, 제목, 배지, 수정·삭제 버튼 |
| `TodoEditor` | src/components/TodoEditor.tsx | 인라인 편집 |
| `Footer` | src/components/Footer.tsx | 남은 개수, 완료 항목 삭제 |
| `Toast` | src/components/Toast.tsx | Undo·오류·안내 메시지 (`aria-live="polite"`) |
| `DataMenu` | src/components/DataMenu.tsx | 내보내기, 가져오기, 확인 대화상자 |
| `ThemeToggle` | src/components/ThemeToggle.tsx | 라이트/다크 전환 |

### 5.4 Page UI Checklist (v2.1.0)

#### Main Page (단일 화면)

- [ ] Header: 앱 제목 "Todo"
- [ ] Button: 테마 전환 (aria-label "다크 모드로 전환"/"라이트 모드로 전환")
- [ ] Menu: 데이터 메뉴 — "내보내기", "가져오기" 2개 항목
- [ ] Input: 할 일 제목 (placeholder "할 일을 입력하세요", maxLength 200, Enter로 추가)
- [ ] Button: 추가 (제목이 비면 비활성)
- [ ] Disclosure: 세부 옵션 펼치기/접기
- [ ] Input: 마감일 (`type="date"`, 선택 사항)
- [ ] Select: 우선순위 3개 옵션 (높음/보통/낮음, 기본 보통)
- [ ] Input: 카테고리 (기존 카테고리 datalist 제안)
- [ ] TagInput: 태그 칩 (최대 10개)
- [ ] Tabs: 상태 필터 3개 (전체/진행 중/완료)
- [ ] Input: 검색 (`type="search"`, 제목·태그 대상)
- [ ] Select: 카테고리 필터 ("전체" + 사용 중 카테고리)
- [ ] Select: 태그 필터 ("전체" + 사용 중 태그)
- [ ] Select: 정렬 3개 옵션 (마감일순/우선순위순/최신순)
- [ ] List item: 완료 체크박스
- [ ] List item: 제목 (완료 시 취소선·흐리게)
- [ ] Badge: 우선순위 (높음=강조색, 보통=중립, 낮음=약함)
- [ ] Badge: 마감 (지남=빨강 "N일 지남", 오늘=주황 "오늘", 이후=날짜)
- [ ] Badge: 카테고리, 태그 칩
- [ ] Button: 수정, 삭제 (아이콘 버튼 + aria-label)
- [ ] Empty state: 할 일 없음 / 검색 결과 없음 문구 구분
- [ ] Footer: 남은 할 일 개수 "남은 일 N개"
- [ ] Button: 완료 항목 삭제 (완료 항목 0개면 비활성)
- [ ] Toast: 삭제 후 "되돌리기" 버튼 (5초)
- [ ] Toast: 저장 실패·데이터 복구·가져오기 결과 안내
- [ ] Dialog: 가져오기 덮어쓰기 확인 ("현재 N개를 가져온 M개로 바꿉니다")
- [ ] Notice: "데이터는 이 브라우저에만 저장됩니다" (푸터 작은 글씨)

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message (사용자 표시) | Cause | Handling |
|------|------|-------|----------|
| `EMPTY_TITLE` | 할 일 내용을 입력하세요 | 빈 제목·공백 | 추가 버튼 비활성, 편집 저장 거부 |
| `TITLE_TOO_LONG` | 200자 이하로 입력하세요 | 길이 초과 | 입력 maxLength + 검증 |
| `INVALID_TAG` | 태그는 20자 이하, 최대 10개입니다 | 태그 규칙 위반 | 칩 추가 거부 + 인라인 안내 |
| `INVALID_CATEGORY` | 카테고리는 30자 이하입니다 | 길이 초과 | 인라인 안내 |
| `STORAGE_QUOTA` | 저장 공간이 부족해 저장하지 못했습니다. 내보내기로 백업하세요 | localStorage 용량 초과 | 토스트, 상태는 유지 |
| `STORAGE_UNAVAILABLE` | 이 브라우저에서는 저장할 수 없습니다 (시크릿 모드 등) | localStorage 접근 불가 | 시작 시 1회 안내, 메모리로만 동작 |
| `STORAGE_CORRUPT` | 저장된 데이터가 손상되어 새로 시작합니다. 원본은 따로 보관했습니다 | 스키마 검증 실패 | 백업 키 저장 후 빈 상태 |
| `IMPORT_INVALID_JSON` | 올바른 JSON 파일이 아닙니다 | 파싱 실패 | 토스트, 데이터 변경 없음 |
| `IMPORT_SCHEMA_MISMATCH` | todo-app 백업 파일이 아니거나 형식이 맞지 않습니다 | 검증 실패 | 토스트, 데이터 변경 없음 |
| `IMPORT_TOO_LARGE` | 5MB 이하 파일만 가져올 수 있습니다 | 파일 크기 | 읽기 전 거부 |
| `IMPORT_BACKUP_FAILED` | 현재 데이터를 백업하지 못해 가져오기를 취소했습니다. 기존 데이터는 그대로입니다 | 가져오기 직전 백업 쓰기 실패 (v0.2) | 가져오기 중단, 데이터 변경 없음 |

### 6.2 Error Response Format

```typescript
// 모든 실패는 Result로 반환 (예외 throw 금지, 단 개발자 오류는 예외)
{ ok: false, error: { code: 'IMPORT_SCHEMA_MISMATCH', message: 'todo-app 백업 파일이 아니거나 형식이 맞지 않습니다' } }
```

---

## 7. Security Considerations

- [x] 입력 렌더링은 React 텍스트 노드로만 (`dangerouslySetInnerHTML` 금지) — XSS 방지
- [x] 가져오기 파일: 크기 제한(5MB) + JSON 파싱 + 필드 단위 스키마 검증, 알 수 없는 필드는 버림
- [x] 가져오기 전 자동 백업 + 덮어쓰기 확인
- N/A 인증·권한, 암호화, Rate Limiting (서버·계정 없음)
- [ ] 배포 시 HTTPS 정적 호스팅 (배포 단계에서)

---

## 8. Test Plan (v2.3.0)

> 서버 API가 없으므로 L1은 "도메인·저장소 단위 테스트"로 대체한다. Do 단계에서 모듈과 테스트를 한 세트로 작성한다.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: Unit Tests | domain, storage, todoReducer, useUndo | Vitest (+ fake timers, 가짜 Storage) | Do |
| L2: Component Tests | 화면 요소·사용자 동작 (§5.4) | Vitest + Testing Library (jsdom) | Do |
| L3: E2E Scenario Tests | 새로고침 지속성, 가져오기/내보내기, 반응형 | Playwright | Do (module-5) |

커버리지 목표: `src/domain`, `src/storage`, `src/state` 합산 ≥ 80% (line·branch).

### 8.2 L1: Unit Test Scenarios

| # | Target | Test Description | Expected |
|---|--------|-----------------|----------|
| 1 | validateTitle | `"  "` / 201자 / `" 장보기 "` | EMPTY_TITLE / TITLE_TOO_LONG / ok `"장보기"` |
| 2 | normalizeTags | `["A", "a ", "b"]`, 11개, 21자 | `["a","b"]` / INVALID_TAG / INVALID_TAG |
| 3 | createTodo | 최소 입력 | priority 'medium', completed false, tags [], createdAt=now |
| 4 | toggleTodo | 두 번 토글 | completedAt 설정 → null |
| 5 | getDueStatus | 어제/오늘/내일/없음/완료된 어제 | overdue/today/upcoming/none/none |
| 6 | sortTodos('dueDate') | 마감 섞임 + null | 오름차순, null 맨 뒤, 원본 배열 불변 |
| 7 | sortTodos('priority') | high/low/medium, 동률 | high→medium→low, 동률은 최신 먼저 |
| 8 | filterTodos | status×text×category×tag 조합 | AND 조건, 대소문자 무시, 태그 텍스트 매칭 |
| 9 | loadTodos | 키 없음 / 정상 / 깨진 JSON / 필드 누락 | [] / todos / recovered + corrupt-backup 저장 |
| 10 | saveTodos | QuotaExceededError 발생 Storage | STORAGE_QUOTA |
| 11 | exportTodos → parseImportFile | 왕복 | 동일 todos |
| 12 | parseImportFile | 잘못된 JSON / 다른 app / schemaVersion 2 / 필드 오류 | 각 오류 코드 |
| 13 | todoReducer | add/update/toggle/remove/clearCompleted/restore/replaceAll, 없는 id | 기대 상태, 없는 id는 동일 참조 반환 |
| 14 | todoReducer restore | 중간 index 2개 삭제 후 복원 | 원래 순서 복구 |
| 15 | useUndo | offer 후 5초 경과 / 그 전 undo | pending 해제 / restore 호출 |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | Main | 로드 | §5.4 주요 요소 표시, 빈 상태 문구 | - |
| 2 | Main | 제목 입력 후 Enter | 목록에 1개, 입력창 비워짐 | localStorage 저장됨 |
| 3 | Main | 공백만 입력 | 추가 버튼 비활성, 목록 변화 없음 | - |
| 4 | Main | 체크박스 클릭 | 취소선, "남은 일" 감소 | completed=true |
| 5 | Main | 편집 → Esc / Enter | 원래 값 유지 / 새 값 반영 | - |
| 6 | Main | 삭제 → 되돌리기 | 항목 사라짐 → 같은 위치로 복원 | - |
| 7 | Main | "완료" 탭 + 검색어 | 조건 맞는 항목만 | 결과 없음 문구 구분 |
| 8 | Main | 정렬 "우선순위순" | 높음이 맨 위 | - |
| 9 | Main | 테마 토글 | `html[data-theme]` 변경 | theme 키 저장 |
| 10 | Main | 손상 데이터로 시작 | 안내 토스트, 빈 목록 | corrupt-backup 존재 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 지속성 | 3개 추가(마감·우선순위·태그) → 1개 완료 → 새로고침 | 3개·완료 상태·속성 그대로 |
| 2 | 백업 왕복 | 내보내기 → 전체 삭제 → 가져오기 → 확인 | 원래 목록 복원 |
| 3 | 잘못된 가져오기 | 임의 JSON 파일 가져오기 | 오류 토스트, 기존 데이터 유지 |
| 4 | 모바일 | 360×740 뷰포트에서 추가·필터·편집 | 가로 스크롤 없음, 모든 버튼 접근 가능 |
| 5 | 키보드 | Tab/Enter/Space/Esc만으로 추가·완료·편집·삭제 | 마우스 없이 완료 |
| 6 | 다크 모드 | 시스템 다크 에뮬레이션 → 첫 로드 → 토글 → 새로고침 | 다크로 시작, 수동 선택 유지 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| Todo (테스트 픽스처) | 8 | 우선순위 3종, 마감 지남/오늘/이후/없음, 완료 2개, 카테고리 2종, 태그 3종 |
| Todo (성능 측정) | 1,000 | `makeTodos(n)` 팩토리로 생성 (NFR: 필터·정렬 < 100ms) |

> Do 단계: `src/test/factories.ts`에 `makeTodo(overrides)`, `makeTodos(n)` 구현.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI 컴포넌트, 테마 훅 | `src/components/`, `src/theme/`, `src/App.tsx` |
| **Application** | 상태 전이, 자동 저장, Undo, 액션 조합 | `src/state/` |
| **Domain** | 타입, 검증, 정렬·필터·마감 규칙 | `src/domain/` |
| **Infrastructure** | localStorage, 스키마 검증, 파일 백업 | `src/storage/` |

### 9.2 Dependency Rules

```
Presentation ──→ Application ──→ Domain ←── Infrastructure
                      │
                      └──→ Infrastructure

Rule: domain은 React·window·localStorage를 import하지 않는다.
      components는 storage를 직접 import하지 않는다 (state를 통해서만).
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| components/, theme/ | state, domain | storage |
| state/ | domain, storage | components |
| domain/ | 없음 (같은 폴더만) | 그 외 전부 |
| storage/ | domain | state, components |

> ESLint `no-restricted-imports`로 위 규칙을 강제한다.

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| Todo, Priority, Result 등 타입 | Domain | `src/domain/todo.ts` |
| validate*, normalizeTags | Domain | `src/domain/validate.ts` |
| sortTodos | Domain | `src/domain/sort.ts` |
| filterTodos, collect* | Domain | `src/domain/filter.ts` |
| getDueStatus, 날짜 유틸 | Domain | `src/domain/date.ts` |
| parseStoredData | Infrastructure | `src/storage/schema.ts` |
| loadTodos, saveTodos | Infrastructure | `src/storage/todoStorage.ts` |
| exportTodos, parseImportFile, backupBeforeImport | Infrastructure | `src/storage/backup.ts` |
| todoReducer | Application | `src/state/todoReducer.ts` |
| TodoProvider, useTodos, useTodoActions | Application | `src/state/TodoContext.tsx` |
| useUndo | Application | `src/state/useUndo.ts` |
| 화면 컴포넌트 | Presentation | `src/components/*.tsx` |
| useTheme | Presentation | `src/theme/useTheme.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `TodoItem`, `FilterBar` |
| Functions | camelCase | `sortTodos()`, `parseImportFile()` |
| Constants | UPPER_SNAKE_CASE | `STORAGE_KEY`, `UNDO_TIMEOUT_MS` |
| Types/Interfaces | PascalCase | `Todo`, `TodoQuery` |
| Files (component) | PascalCase.tsx | `TodoItem.tsx` |
| Files (utility) | camelCase.ts | `todoStorage.ts` |
| Folders | lowercase | `domain/`, `storage/` |
| Tests | 대상 옆 `*.test.ts(x)` | `sort.test.ts` |

### 10.2 Import Order

```typescript
// 1. External libraries
import { useReducer } from 'react'
// 2. Internal (@/ = src/)
import { sortTodos } from '@/domain/sort'
// 3. Relative
import { TagInput } from './TagInput'
// 4. Type imports
import type { Todo } from '@/domain/todo'
// 5. Styles
import styles from './TodoItem.module.css'
```

### 10.3 Environment Variables

없음. (필요 시 `VITE_` 접두사)

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase, 파일 하나에 컴포넌트 하나 |
| File organization | 레이어 폴더 + 테스트는 대상 옆 |
| State management | `useReducer` + Context, 파생 데이터(필터·정렬 결과)는 `useMemo`로 계산하고 저장하지 않음 |
| Error handling | `Result` 반환, UI는 `Toast`로 안내, 예외는 개발자 오류에만 |
| Styling | CSS Modules + `theme.css`의 CSS 변수 (`--color-bg`, `--color-text`, `--color-accent`, `--color-danger` …), `[data-theme="dark"]`에서 재정의 |
| Dates | 마감일은 `'YYYY-MM-DD'` 문자열, "오늘"은 로컬 시간대 기준으로 domain/date.ts에서만 계산 |
| Design Ref comments | 모듈 상단 `// Design Ref: §N — 이유`, 핵심 로직에 `// Plan SC: …` (bkit 규칙) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
todo-app/
├── index.html
├── package.json, vite.config.ts, tsconfig.json, eslint.config.js, .prettierrc
├── playwright.config.ts
├── e2e/                         todo.spec.ts
└── src/
    ├── main.tsx, App.tsx, App.module.css
    ├── domain/                  todo.ts, validate.ts, date.ts, sort.ts, filter.ts (+ *.test.ts)
    ├── storage/                 schema.ts, todoStorage.ts, backup.ts (+ *.test.ts)
    ├── state/                   todoReducer.ts, TodoContext.tsx, useUndo.ts (+ *.test.ts)
    ├── components/              Header, TodoInput, TodoDetailsFields, TagInput, FilterBar,
    │                            TodoList, TodoItem, TodoEditor, Footer, Toast, DataMenu,
    │                            ThemeToggle (+ *.module.css, 주요 *.test.tsx)
    ├── theme/                   useTheme.ts, theme.css
    └── test/                    setup.ts, factories.ts
```

### 11.2 Implementation Order

1. [ ] 프로젝트 생성 (Vite react-ts), ESLint·Prettier·Vitest·경로 별칭 `@/` 설정, `CLAUDE.md` 작성
2. [ ] domain: 타입 → validate → date → sort → filter (+ 단위 테스트)
3. [ ] storage: schema → todoStorage → backup (+ 단위 테스트)
4. [ ] state: todoReducer → TodoContext(초기 로드·자동 저장) → useUndo (+ 테스트)
5. [ ] 핵심 UI: TodoInput(제목만) → TodoList → TodoItem → TodoEditor → Footer (FR-01~05)
6. [ ] 세부 속성 UI: TodoDetailsFields, TagInput, 배지 (FR-06, 07, 10)
7. [ ] FilterBar: 상태 탭·검색·카테고리·태그·정렬 (FR-08~10)
8. [ ] ThemeToggle + theme.css (FR-11)
9. [ ] Toast + Undo 연결, 완료 항목 삭제 (FR-12)
10. [ ] DataMenu: 내보내기·가져오기·확인 대화상자, 손상 안내 (FR-13, 14)
11. [ ] Playwright E2E, 반응형·접근성 점검, 1,000개 성능 측정, README

### 11.3 Session Guide

> Session split is recommended, not required. Use `/pdca do todo-app --scope module-N` to implement one module per session.

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 기반 + 도메인 | `module-1` | 프로젝트 생성·도구 설정, domain 전체 + 단위 테스트 (순서 1~2) | 30-40 |
| 저장소 + 상태 | `module-2` | storage, state(reducer·Context·useUndo) + 테스트 (순서 3~4) | 30-40 |
| 핵심 UI | `module-3` | CRUD 화면, 자동 저장 연결 (순서 5, FR-01~05) | 30-40 |
| 정리 기능 UI | `module-4` | 세부 속성, 필터·검색·정렬, 카테고리·태그 (순서 6~7, FR-06~10) | 30-40 |
| 마무리 | `module-5` | 다크 모드, Undo, 일괄 삭제, 백업·복구, E2E·성능·README (순서 8~11, FR-11~14) | 40-50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 완료 |
| Session 2 | Do | `--scope module-1,module-2` | 50-70 |
| Session 3 | Do | `--scope module-3,module-4` | 50-70 |
| Session 4 | Do | `--scope module-5` | 40-50 |
| Session 5 | Check + Report | 전체 | 30-40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-10-12 | Initial draft — Option C 선택 (Checkpoint 3) | biggsman |
| 0.2 | 2026-10-13 | module-5 결정 반영: 마감일·우선순위 정렬 시 완료 항목은 뒤로, `backupBeforeImport`가 `Result` 반환(실패 시 가져오기 중단), 파일 크기 상수 `MAX_IMPORT_BYTES`는 domain으로 이동, 오류 코드 `IMPORT_BACKUP_FAILED` 추가 | biggsman |
