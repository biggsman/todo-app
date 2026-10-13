# todo-app Analysis Report

> **Analysis Type**: Gap Analysis / Code Quality / Runtime Verification
>
> **Project**: todo-app
> **Version**: 0.1.0
> **Analyst**: biggsman (bkit gap-detector + runtime verification)
> **Date**: 2026-10-13
> **Design Doc**: [todo-app.design.md](../02-design/features/todo-app.design.md) (v0.2)

### Pipeline References (for verification)

| Phase | Document | Verification Target |
|-------|----------|---------------------|
| Phase 1 | N/A — Design §3 | Data model / storage keys |
| Phase 2 | N/A — Design §10, `CLAUDE.md` | Convention compliance |
| Phase 4 | N/A — Design §4 (module contracts, no HTTP API) | Contract match |
| Phase 8 | 본 문서 §6–7 | Architecture/Convention review |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 흩어진 할 일 때문에 마감·중요한 일을 놓치는 문제를, 가입 없이 바로 쓰는 정리 도구로 해결 |
| **WHO** | 개인 사용자 1인 (데스크톱·모바일 브라우저), 로그인·동기화 불필요 |
| **RISK** | localStorage 데이터 유실·손상 → JSON 백업/가져오기, 손상 감지 시 백업 후 복구로 대응 |
| **SUCCESS** | FR-01~FR-14 구현, 도메인 로직 테스트 커버리지 ≥ 80%, 린트 0·빌드 성공, 모바일(360px)·다크 모드 정상 |
| **SCOPE** | 1) 핵심 CRUD + 저장 → 2) 마감일·우선순위·정렬 → 3) 필터·검색·카테고리·태그 → 4) 다크 모드·Undo·백업·복구 |

---

## Strategic Alignment Check

### PRD Alignment

PRD 없음 (Starter 레벨, `/pdca pm` 미지원). Plan Checkpoint 1·2 답변을 기준으로 검증.

| Element | Expected | Status |
|---------|----------|:------:|
| Core Problem (WHY) | 마감·중요도·분류로 놓치지 않게 관리 | ✅ Addressed — 마감 배지(지남/오늘), 우선순위·카테고리·태그, 필터·정렬 |
| Target User (WHO) | 개인 1인, 로그인 없음 | ✅ Addressed — 계정·서버 없음, localStorage |
| Value Proposition | 설정 0, 즉시 사용, 내 데이터는 내 브라우저 | ✅ Delivered — 첫 화면 바로 입력, 백업/복원 제공 |

### Success Criteria Status

| # | Criteria (from Plan §4) | Status | Evidence |
|---|---------------------|:------:|----------|
| SC-1 | FR-01 ~ FR-14 구현 | ✅ | §2.5 FR 표 (14/14) |
| SC-2 | 단위 테스트 작성 및 통과 | ✅ | Vitest 19 files / 263 tests passed |
| SC-3 | `/pdca analyze` Match Rate ≥ 90% | ✅ | §2.8: 99% |
| SC-4 | README에 실행·빌드·테스트 방법 | ✅ | README.md |
| SC-5 | domain·storage·state 커버리지 ≥ 80% | ✅ | Stmts 99.74 / Branch 99.54 / Funcs 100 / Lines 100 |
| SC-6 | 린트 오류 0, 타입 오류 0 | ✅ | `npm run lint`, `npm run typecheck` exit 0 (2026-10-13 재실행) |
| SC-7 | `npm run build` 성공 | ✅ | `✓ built` (JS 258.55 kB, gzip 81.12 kB) |
| SC-8 | 모바일 360px·다크 모드 정상 | ✅ | E2E #4, #6 + 스크린샷 18장 검수 |

**Success Rate**: 8/8 criteria met

### Decision Record Verification

| Source | Decision | Followed? | Deviation |
|--------|----------|:---------:|-----------|
| [Plan] | React + Vite + TS, localStorage, 정적 배포, Starter | ✅ | - |
| [Plan] | 런타임 의존성 최소 (React만) | ⚠️ | 웹폰트 2개 추가 (Geist, Pretendard; self-hosted) — module-3에서 사용자 승인. 문서 갱신 필요 (G5) |
| [Design] | Option C 실용 절충, §9.3 import 규칙 | ✅ | 위반 0건, ESLint `no-restricted-imports`로 강제 |
| [Design] | useReducer + Context, 파생 데이터는 useMemo | ✅ | 정렬·필터 파생은 `components/useTodoView.ts` (설계 §2.1 그림과 위치만 다름) |
| [Design] | CSS Modules + theme.css 변수 | ✅ | - |
| [Design v0.2] | 완료 항목은 마감일·우선순위 정렬에서 뒤로 | ✅ | sort.ts:15-28 |
| [Design v0.2] | 가져오기 전 백업 실패 시 중단 | ✅ | backup.ts:71-79, TodoContext.tsx:135-147 (`IMPORT_BACKUP_FAILED`) |

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

module-1~5 구현 완료 후, 설계 v0.2 및 Plan 요구사항과의 일치도를 측정하고 남은 Gap을 분류한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/todo-app.design.md` (v0.2)
- **Implementation Path**: `src/` (domain, storage, state, components, theme), `e2e/`, `index.html`
- **Analysis Date**: 2026-10-13
- **Method**: bkit gap-detector 정적 분석 + 단위/UI/E2E 실행 + 스크린샷 검수

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 Module Contracts (서버 API 대신 §4 함수 계약)

설계 §4.1 18개 시그니처 → export → 호출 지점 3-way 연결 **18/18 확인**. 코드 수정이 필요한 계약 차이 **없음**. 아래는 설계 문서 갱신 대상:

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| `getDueStatus` in domain/todo (§4.1) | domain/date.ts:49 | ⚠️ Design inconsistent | §9.4는 date.ts — §4.1 표 수정 |
| `useUndo().undo()` dispatch | `undo(): RemovedItem[] \| null`, Provider가 restore dispatch | ⚠️ Missing in design | 의미 동일 |
| `useTodos()` 형태 미정의 | `{ todos, storageStatus, pendingUndo }` | ⚠️ Missing in design | `PendingUndo {reason, items}` |
| - | `useTodoActions().exportFile / parseImport` | ⚠️ Missing in design | components→storage 금지 규칙 때문에 필요 |
| `importTodos` | `Result<void>` 반환 | ⚠️ Missing in design | v0.2 결정의 결과 |
| `parseImportFile` 오류 | `IMPORT_TOO_LARGE` 추가 반환, 스키마 오류에 `(경로)` 덧붙임 | ⚠️ Missing in design | 이중 방어 / 위치 정보 |
| `saveTodos` 오류 | 비-용량 실패는 `STORAGE_UNAVAILABLE` | ⚠️ Missing in design | - |

### 2.2 Data Model

| Field | Design Type | Impl Type | Status |
|-------|-------------|-----------|--------|
| Todo 10개 필드 | §3.1 | todo.ts:9-20 | ✅ 10/10 |
| 저장 키 4개 | §3.3 | schema.ts:11-14, useTheme.ts:10 | ✅ (theme 키는 theme/가 관리 — 문서 갱신) |
| Export 파일 형식·파일명 | §3.3 | backup.ts:29-41 | ✅ |
| 오류 코드·메시지 | §6.1 (11개, v0.2) | errors.ts:5-18 | ✅ 11/11 글자 일치 |

### 2.3 Component Structure

설계 §5.3(13) + §9.4(12) + §11.1(13) = 38개 항목 **38/38 존재**. 설계에 없는 추가 파일(모두 타당, 문서 등록 필요): `domain/errors.ts`, `domain/importFile.ts`, `components/useTodoView.ts`, `useNotices.ts`, `useStorageNotices.ts`, `todoFocus.ts`, `downloadFile.ts`, `todoDetails.ts`, `ConfirmDialog`, `TodoBadges`, `icons/`(17).

### 2.4 Functional Depth Analysis

플레이스홀더·TODO·console.log **0건**. 60점 미만(SHALLOW) 파일 **0 / 57** (0%).

### 2.5 Page UI Checklist Verification

| Page | Design Elements | Implemented | Partial | Missing | Rate |
|------|:--------------:|:-----------:|:-------:|:-------:|:----:|
| Main | 28 | 27 | 1 | 0 | 98% |

Partial: 상태 필터를 ARIA Tabs 대신 토글 버튼 그룹(`role="group"` + `aria-pressed`)으로 구현 — 패널 전환이 아닌 필터이므로 의미상 더 타당. 설계 수정.

FR-01~FR-14: **14/14 구현** (근거: gap-detector 보고, 파일:줄 단위).

**Functional Match Rate**: 98%

### 2.6 Contract Verification

| 대상 | 항목 수 | 일치 | 부분 |
|------|:------:|:----:|:----:|
| §4.1 시그니처 + §4.2 TodoAction·리듀서 규칙·parseImportFile | 23 | 23 | 0 |
| §6.1 오류 코드·메시지 | 11 | 10 | 1 (IMPORT_SCHEMA_MISMATCH에 경로 덧붙임) |
| §3 데이터 모델·키·내보내기 형식 | 6 | 6 | 0 |

**Contract Match Rate**: 39.5/40 = 99%

### 2.7 Runtime Verification Results

서버 API가 없으므로 설계 §8.1에 따라 L1은 단위 테스트로 대체.

#### L1: Unit Tests (Vitest) — 설계 §8.2 #1~15

| # | Test | Pass |
|---|------|:----:|
| 1–8 | domain (validate, createTodo, toggle, getDueStatus, sort, filter) | ✅ |
| 9–12 | storage (load/save/quota/export↔import/import errors) | ✅ |
| 13–15 | state (todoReducer, restore 순서, useUndo) | ✅ |

**L1 Score**: 15/15 = 100% (전체 263 tests passed)

#### L2: UI Action Tests (Testing Library) — 설계 §8.3 #1~10

| # | Action | Expected Result | Pass |
|---|--------|----------------|:----:|
| 1 | 로드 | 주요 요소·빈 상태 | ✅ |
| 2 | Enter로 추가 | 목록 추가, 입력 비움, 저장 | ✅ |
| 3 | 공백만 입력 | 추가 비활성 | ✅ |
| 4 | 체크 | 취소선, 남은 일 감소 | ✅ |
| 5 | 편집 Esc / Enter | 유지 / 반영 | ✅ |
| 6 | 삭제 → 되돌리기 | 같은 위치 복원 + 포커스 | ✅ |
| 7 | 완료 탭 + 검색 | 조건 맞는 항목만, 결과 없음 문구 | ✅ |
| 8 | 우선순위순 | 높음 먼저 | ✅ |
| 9 | 테마 토글 | data-theme 변경, 키 저장 | ✅ |
| 10 | 손상 데이터 | 안내 토스트, 빈 목록, 백업 키 | ✅ |

**L2 Score**: 10/10 = 100%

#### L3: E2E Scenario Tests (Playwright, local Chrome) — 설계 §8.4 #1~6

| # | Scenario | Result | Pass |
|---|----------|--------|:----:|
| 1 | 지속성 | 속성 포함 새로고침 후 유지 | ✅ |
| 2 | 백업 왕복 | 내려받은 파일로 내보내기→전체 삭제→가져오기 | ✅ |
| 3 | 잘못된 가져오기 | 스키마 불일치·깨진 JSON 모두 오류, 데이터 유지 | ✅ |
| 4 | 모바일 360×740 | 가로 스크롤 없음, 추가·필터·편집 | ✅ |
| 5 | 키보드만 | 추가·완료·편집·취소·삭제·되돌리기 | ✅ |
| 6 | 다크 모드 (2 tests) | 시스템 다크 시작, 수동 선택 유지, 깜빡임 없음 | ✅ |

**L3 Score**: 7/7 = 100%

**Runtime Match Rate**: (L1 × 0.4 + L2 × 0.3 + L3 × 0.3) = 100%

### 2.8 Match Rate Summary

```
┌─────────────────────────────────────────────┐
│  Structural Match Rate:  100%                │
│  Functional Match Rate:   98%                │
│  Contract Match Rate:     99%                │
│  Runtime Match Rate:     100%                │
│  ─────────────────────────────────────────── │
│  Overall Match Rate:      99%                │
│  = (100 × 0.15) + (98 × 0.25)                │
│    + (99 × 0.25) + (100 × 0.35) = 99.25      │
├─────────────────────────────────────────────┤
│  ✅ Match:           66 items                │
│  ⚠️ Partial/doc-only: 12 items (design 갱신) │
│  ❌ Not implemented:   0 items               │
└─────────────────────────────────────────────┘
```

> 참고: gap-detector의 확장 점수(Intent·Behavioral·UX 축 포함)는 96%. 차이는 G1(Undo 타이머), G2(Lighthouse 미측정), G3(손상 백업 실패) 반영분.

---

## 3. Code Quality Analysis

### 3.1 Complexity Analysis

과도하게 긴 함수·깊은 중첩 없음. 가장 큰 모듈은 `state/TodoContext.tsx`(액션 10개)와 `components/DataMenu.tsx`(메뉴 + 가져오기 흐름) — 현재 규모에서 허용.

### 3.2 Code Smells

| Type | File | Location | Description | Severity |
|------|------|----------|-------------|----------|
| Re-render breadth | state/TodoContext.tsx | :94-155 | actions 객체가 `todos`에 의존 → 변경마다 모든 TodoItem 재렌더, `React.memo` 없음 (G6) | 🟢 |
| Convention | src/main.tsx | :1-7 | Design Ref 주석 없음, import 순서·`.tsx` 확장자 (G9) | 🟢 |

### 3.3 Security Issues

| Severity | File | Issue | Recommendation |
|----------|------|-------|----------------|
| 🟢 Info | - | `dangerouslySetInnerHTML`/`innerHTML` 0건, 가져오기 필드 단위 검증·5MB 제한·알 수 없는 필드 제거·id 중복 거부 | 유지 |

---

## 4. Performance Analysis

### 4.1 Response Time

| Target | Measured | Goal | Status |
|--------|----------|------|--------|
| filter + sort (1,000 todos, domain) | < 100ms (performance.test.ts, 3 정렬 × 2 조건) | < 100ms | ✅ |
| 검색 입력 → 목록 갱신 (1,000 todos, 브라우저) | 미측정 | < 100ms | ⚠️ (G6) |

### 4.2 Bottlenecks

| Location | Problem | Impact | Recommendation |
|----------|---------|--------|----------------|
| TodoContext actions / TodoItem | 전체 재렌더 | 1,000개에서 입력 지연 가능성 | 측정 후 필요 시 `React.memo` + actions 참조 안정화 |

---

## 5. Test Coverage

### 5.1 Coverage Status

| Area | Current | Target | Status |
|------|---------|--------|--------|
| Statements | 99.74% | 80% | ✅ |
| Branches | 99.54% | 80% | ✅ |
| Functions | 100% | 80% | ✅ |
| Lines | 100% | 80% | ✅ |

### 5.2 Uncovered Areas

- `src/storage/todoStorage.ts:47` — `localStorage` 자체가 없는 환경 분기 (branch 93.8%)

---

## 6. Clean Architecture Compliance

### 6.1 Layer Dependency Verification

| Layer | Expected Dependencies | Actual | Status |
|-------|----------------------|--------|--------|
| Presentation (components, theme) | state, domain | state, domain | ✅ |
| Application (state) | domain, storage | domain, storage | ✅ |
| Domain | 없음 | 같은 폴더만 | ✅ |
| Infrastructure (storage) | domain | domain | ✅ |

### 6.2 Dependency Violations

없음 (테스트 파일 제외 grep, ESLint 강제).

### 6.3 Layer Assignment Verification

§9.4 12개 항목 모두 지정 위치에 존재. 추가 모듈은 §2.3 참조.

### 6.4 Architecture Score

```
┌─────────────────────────────────────────────┐
│  Architecture Compliance: 100%               │
├─────────────────────────────────────────────┤
│  ✅ Correct layer placement: all files       │
│  ⚠️ Dependency violations:   0 files         │
│  ❌ Wrong layer:              0 files         │
└─────────────────────────────────────────────┘
```

---

## 7. Convention Compliance

### 7.1 Naming Convention Check

| Category | Convention | Compliance |
|----------|-----------|:----------:|
| Components | PascalCase.tsx | 100% |
| Functions | camelCase | 100% |
| Constants | UPPER_SNAKE_CASE | 100% |
| Files (utility) | camelCase.ts | 100% |
| Folders | lowercase | 100% |

### 7.2 Folder Structure Check

설계 §11.1 구조와 일치 (`domain/ storage/ state/ components/ theme/ test/`, `e2e/`).

### 7.3 Import Order Check

`src/main.tsx`만 예외 (스타일 import 뒤 `./App.tsx`). CSS 적용 순서 의도라면 주석으로 이유 기록 (G9).

### 7.4 Environment Variable Check

환경 변수 없음 (설계와 일치).

### 7.5 Convention Score

```
┌─────────────────────────────────────────────┐
│  Convention Compliance: 96%                  │
├─────────────────────────────────────────────┤
│  Naming:           100%                      │
│  Folder Structure: 100%                      │
│  Import Order:      98%                      │
│  Design Ref 주석:   98% (56/57)              │
│  문서-실제 일치:    90% (CLAUDE.md, G5)       │
└─────────────────────────────────────────────┘
```

---

## 8. Overall Score

```
┌─────────────────────────────────────────────┐
│  Overall Score: 95/100                       │
├─────────────────────────────────────────────┤
│  Design Match:        99 points              │
│  Code Quality:        94 points              │
│  Security:            98 points              │
│  Testing:            100 points              │
│  Performance:         88 points (UI 미측정)   │
│  Architecture:       100 points              │
│  Convention:          96 points              │
│  Accessibility:       85 points (G1, G2)     │
└─────────────────────────────────────────────┘
```

---

## 9. Recommended Actions

Critical: **없음**.

### 9.1 Important

| ID | Item | File | Fix Type |
|----|------|------|----------|
| G1 | Undo 토스트 5초 타이머가 hover/focus 중에도 멈추지 않음 — WCAG 2.2.1 (Level A) 위반 가능. 토스트가 DOM 끝에 있어 키보드 사용자가 5초 안에 닿기 어려움 | state/useUndo.ts:36-44, components/Toast.tsx:60-82 | 코드: `pause()/resume()` 추가, 토스트 pointer/focus 이벤트 연결 + 테스트 |
| G2 | Lighthouse 접근성 ≥ 90 (Plan NFR) 미측정 | - | 검증: 라이트·다크 각각 측정 후 기록 |

### 9.2 Minor

| ID | Item | File | Fix Type |
|----|------|------|----------|
| G3 | 손상 원본 백업 쓰기 실패 시에도 "원본은 따로 보관했습니다" 안내, 이후 첫 저장이 유일한 원본을 덮어씀 | storage/todoStorage.ts:24-26,73-80, useStorageNotices.ts:18 | 코드: `backupSaved` 플래그, 다른 안내 + 자동 저장 보류 |
| G4 | 다크 `--color-text-subtle` × `--color-surface-raised` 대비 4.17 (현재 미사용 조합) | theme/theme.css:122,132 | 코드: subtle 값 상향 (~`#92929c`) |
| G5 | CLAUDE.md에 `test:e2e` 없음, "런타임 의존성은 React만" 문구가 실제(웹폰트 2개)와 다름 | CLAUDE.md, design §1.1 | 문서 |
| G6 | 1,000개 UI 입력 반응 미측정, 전체 재렌더 구조 | TodoContext.tsx:154, TodoItem.tsx | 측정 후 필요 시 코드 |
| G7 | 지원하지 않는 schemaVersion은 손상으로 처리, 마이그레이션 정책 미기술 | storage/schema.ts:35 | 설계 문서 |
| G8 | IMPORT_SCHEMA_MISMATCH 토스트에 영문 경로 `(todos[2].priority)` 노출 | storage/backup.ts:81-86 | 설계 명시 (선택: 한국어 표기) |
| G9 | main.tsx Design Ref 주석·import 순서 | src/main.tsx:1-7 | 코드 (작음) |
| G10 | 태그 "공백 제거" 의미 모호 (구현: 앞뒤만) | domain/validate.ts:25 | 설계 문서 |
| G11 | pre-import-backup 보관 정책 미기술 | storage/backup.ts:71-79 | 설계/README |

### 9.3 Long-term (backlog)

| Item | Notes |
|------|-------|
| 키보드 E2E에 필터·정렬·데이터 메뉴 추가 | 현재 DataMenu 키보드는 단위 테스트로만 확인 |
| 1440px 뷰포트 E2E | 최대 폭 680px 컨테이너라 위험 낮음 |
| 실제 모바일 기기·Safari·Firefox·스크린리더 점검 | 자동화 범위 밖 |

---

## 10. Design Document Updates Needed (→ v0.3)

- [ ] §4.1 `getDueStatus` 모듈을 `domain/date`로 수정
- [ ] §4.1·§4.2·§6.2 `parseImportFile`: `IMPORT_TOO_LARGE` 반환 가능, 스키마 오류 메시지 형식 `"{메시지} ({경로})"`
- [ ] §4.1 `useUndo`: `undo(): RemovedItem[] | null`, `UNDO_TIMEOUT_MS`, (G1 수정 시) `pause/resume`
- [ ] 새 소절 "state/TodoContext 계약": `useTodos()`·`PendingUndo`·`useTodoActions()` 전체 시그니처 (exportFile, parseImport, importTodos → Result)
- [ ] §3.3 `todo-app:theme`은 `theme/useTheme.ts` + `index.html` 초기 스크립트가 관리
- [ ] §4.1 storage: `saveTodos`의 `STORAGE_UNAVAILABLE`, 보조 함수 `getBrowserStorage`·`parseTodoList`·`toStoredData`
- [ ] §2.1·§2.3 정렬·필터 파생은 `components/useTodoView.ts` (UI 상태, 비저장), 기본 정렬 마감일순
- [ ] §9.4·§11.1 추가 모듈 등록 (§2.3 목록)
- [ ] §5.4 상태 필터 = 토글 버튼 그룹, "필터 초기화", 480px 이하 필터 접힘, 토스트 문구·지속 규칙, 대화상자 제목/버튼
- [ ] §1.1·§2.3 self-hosted 웹폰트 의존성 허용 명시
- [ ] §3.1 태그 "앞뒤 공백 제거" (G10), §3.3·§6.1 schemaVersion 정책 (G7)
- [ ] §8.1 E2E 명령 `npm run test:e2e`, preview 포트 4181, `channel: 'chrome'`

---

## 11. Next Steps

- [ ] Checkpoint 5 결정에 따라 G1·G3 등 수정 (`/pdca iterate todo-app`) 또는 그대로 진행
- [ ] G2 Lighthouse 측정
- [ ] 설계 문서 v0.3 갱신, CLAUDE.md 갱신 (G5)
- [ ] 완료 보고서 작성 (`/pdca report todo-app`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-10-13 | Initial analysis — Match Rate 99%, Critical 0, Important 2, Minor 9 | biggsman |
