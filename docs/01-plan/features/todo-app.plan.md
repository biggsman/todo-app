# todo-app Planning Document

> **Summary**: 로그인 없이 브라우저에 저장되는 개인용 할 일 관리 웹앱 (마감일·우선순위·필터·검색·태그·다크 모드)
>
> **Project**: todo-app
> **Version**: 0.1.0 (pre-init)
> **Author**: biggsman
> **Date**: 2026-10-12
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 할 일이 메모·머릿속에 흩어져 있어 마감과 중요도를 놓치기 쉽고, 가벼운 도구는 정리 기능이, 무거운 도구는 가입·설정 부담이 있다. |
| **Solution** | 가입·서버 없이 브라우저(localStorage)에 저장되는 React + Vite + TypeScript 정적 웹앱으로, 마감일·우선순위·카테고리·태그와 필터·검색을 제공한다. |
| **Function/UX Effect** | 열자마자 바로 입력하고, 정렬·필터로 "지금 할 일"을 한눈에 보며, Undo·JSON 백업으로 실수와 데이터 손실을 막는다. 모바일·다크 모드 지원. |
| **Core Value** | 설정 0, 즉시 사용, 내 데이터는 내 브라우저에 — 가볍지만 정리가 되는 개인 할 일 관리. |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 흩어진 할 일 때문에 마감·중요한 일을 놓치는 문제를, 가입 없이 바로 쓰는 정리 도구로 해결 |
| **WHO** | 개인 사용자 1인 (데스크톱·모바일 브라우저), 로그인·동기화 불필요 |
| **RISK** | localStorage 데이터 유실·손상 → JSON 백업/가져오기, 손상 감지 시 백업 후 복구로 대응 |
| **SUCCESS** | FR-01~FR-14 구현, 도메인 로직 테스트 커버리지 ≥ 80%, 린트 0·빌드 성공, 모바일(360px)·다크 모드 정상 |
| **SCOPE** | 1) 핵심 CRUD + 저장 → 2) 마감일·우선순위·정렬 → 3) 필터·검색·카테고리·태그 → 4) 다크 모드·Undo·백업·복구 |

---

## 1. Overview

### 1.1 Purpose

개인 사용자가 할 일을 빠르게 기록하고, 마감일·우선순위·카테고리·태그로 정리해 해야 할 일을 놓치지 않도록 돕는다.

### 1.2 Background

- 기존 도구는 너무 단순(메모장)하거나, 가입·동기화·협업 기능으로 무겁다.
- 개인용이므로 서버·계정 없이 브라우저 저장만으로 충분하며, 정적 배포로 운영 비용이 없다.
- 대신 브라우저 데이터는 지워질 수 있으므로 백업(JSON 내보내기/가져오기)과 손상 복구를 기본 기능으로 넣는다.

### 1.3 Related Documents

- Requirements: 사용자 확인 사항 (2026-10-12 Checkpoint 1·2)
- PRD: 없음 (`/pdca pm`은 Starter 레벨 미지원)
- References: -

---

## 2. Scope

### 2.1 In Scope

- [ ] 할 일 추가 / 완료 체크 / 제목 수정 / 삭제
- [ ] localStorage 자동 저장 및 새로고침 후 복원
- [ ] 마감일·우선순위(높음/보통/낮음) 지정 및 정렬 (마감일순, 우선순위순, 생성순)
- [ ] 상태 필터(전체/진행 중/완료) + 키워드 검색
- [ ] 카테고리(1개) · 태그(여러 개) 지정 및 필터
- [ ] 다크 모드 (시스템 설정 기본, 수동 전환, 선택 기억)
- [ ] 삭제 취소(Undo)
- [ ] 완료 항목 일괄 삭제
- [ ] JSON 내보내기 / 가져오기
- [ ] 저장 데이터 손상 감지 및 복구
- [ ] 반응형(모바일) UI, 키보드 조작

### 2.2 Out of Scope

- 회원가입·로그인, 서버 저장, 기기 간 동기화
- 다른 사람과 공유·협업, 담당자 지정
- 알림(푸시·이메일), 반복 일정, 하위 할 일(서브태스크)
- 드래그 앤 드롭 수동 정렬
- 배포 (구현 완료 후 별도 결정)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 제목을 입력하고 Enter 또는 추가 버튼으로 할 일을 만든다. 빈 제목·공백만 있는 제목은 거부한다. | High | Pending |
| FR-02 | 체크박스로 완료/미완료를 전환한다. | High | Pending |
| FR-03 | 제목·마감일·우선순위·카테고리·태그를 수정한다 (Esc 취소, Enter 저장). | High | Pending |
| FR-04 | 할 일을 삭제한다. | High | Pending |
| FR-05 | 모든 변경은 localStorage에 자동 저장되고, 새로고침 후 그대로 복원된다. | High | Pending |
| FR-06 | 마감일(선택)을 지정하고, 지난 마감·오늘 마감을 시각적으로 구분한다. | High | Pending |
| FR-07 | 우선순위(높음/보통/낮음, 기본 보통)를 지정한다. | High | Pending |
| FR-08 | 마감일순·우선순위순·생성순으로 정렬한다 (마감일 없는 항목은 뒤로). | Medium | Pending |
| FR-09 | 전체/진행 중/완료 필터와 제목·태그 키워드 검색(대소문자 무시)을 조합해 쓴다. | High | Pending |
| FR-10 | 카테고리(1개)와 태그(여러 개)를 지정하고, 카테고리·태그로 필터한다. | Medium | Pending |
| FR-11 | 다크 모드: 첫 방문은 시스템 설정을 따르고, 수동 전환 값은 기억한다. | Medium | Pending |
| FR-12 | 삭제 후 약 5초 동안 "되돌리기"로 복원할 수 있다. 완료 항목 일괄 삭제도 되돌릴 수 있다. | Medium | Pending |
| FR-13 | 전체 데이터를 JSON 파일로 내보내고, JSON 파일을 가져온다(가져오기 전 형식 검증, 덮어쓰기 확인). | Medium | Pending |
| FR-14 | 저장 데이터가 손상되면 앱이 멈추지 않고, 원본을 별도 키에 백업한 뒤 빈 상태로 시작하며 사용자에게 알린다. | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 할 일 1,000개에서 입력·필터·정렬 반응 < 100ms | 시드 데이터로 브라우저 Performance 측정 |
| Responsiveness | 360px ~ 1440px 화면에서 가로 스크롤·잘림 없음 | 브라우저 반응형 모드 확인 |
| Accessibility | 키보드만으로 모든 기능 사용 가능, 대비 WCAG 2.1 AA (라이트·다크 모두) | 수동 키보드 테스트, Lighthouse 접근성 ≥ 90 |
| Security | 사용자 입력을 HTML로 삽입하지 않음(XSS 방지), 가져오기 JSON 스키마 검증 | 코드 리뷰, 악성 입력 테스트 |
| Reliability | 손상·구버전 데이터에서도 크래시 없음 (스키마 버전 필드로 마이그레이션) | 단위 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-14 구현
- [ ] 단위 테스트 작성 및 통과 (도메인 로직·저장소·가져오기 검증)
- [ ] 코드 리뷰 완료 (`/pdca analyze` Match Rate ≥ 90%)
- [ ] README에 실행·빌드·테스트 방법 기록

### 4.2 Quality Criteria

- [ ] 도메인·저장 로직 테스트 커버리지 ≥ 80%
- [ ] 린트 오류 0, 타입 오류 0
- [ ] `npm run build` 성공
- [ ] 모바일(360px)·다크 모드에서 주요 화면 정상 표시

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 브라우저 데이터 삭제·시크릿 모드로 데이터 유실 | High | Medium | JSON 내보내기 제공, 앱 안에 "브라우저에만 저장됨" 안내 |
| localStorage 데이터 손상·구버전 형식 | Medium | Low | 스키마 버전 필드 + 검증, 실패 시 원본 백업 후 초기화 (FR-14) |
| 잘못된 JSON 가져오기로 기존 데이터 덮어쓰기 | High | Medium | 가져오기 전 형식 검증, 덮어쓰기 확인, 가져오기 직전 자동 백업 |
| localStorage 용량 한도(약 5MB) 초과 | Low | Low | 저장 실패 시 오류 안내, 1,000개 기준 용량 측정 |
| 기능이 많아 UI가 복잡해짐 | Medium | Medium | 기본 화면은 입력+목록만, 정렬·필터는 접을 수 있는 도구 영역으로 |

---

## 6. Impact Analysis

> 신규 프로젝트로, 기존 코드·소비자가 없다.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `localStorage["todo-app:v1"]` | Storage Schema | 신규: 할 일 목록 + 스키마 버전 |
| `localStorage["todo-app:theme"]` | Storage | 신규: 다크 모드 선택값 |
| `localStorage["todo-app:corrupt-backup"]` | Storage | 신규: 손상 데이터 백업 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| (없음) | - | 신규 프로젝트 | None |

### 6.3 Verification

- [x] 기존 소비자 없음 (신규 프로젝트)
- [ ] 저장 키에 버전을 포함해 향후 스키마 변경 시 마이그레이션 가능

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☑ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☐ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | React + Vite + TypeScript | 서버 기능 불필요, 빠른 개발 서버와 정적 빌드. 사용자 선택 |
| State Management | Context / Zustand / Redux / Jotai | useReducer + Context | 단일 화면·단일 데이터 소스로 충분, 의존성 최소화 |
| API Client | fetch / axios / react-query | 없음 (localStorage 저장소 모듈) | 서버 통신 없음 |
| Form Handling | react-hook-form / formik / native | native (controlled input) | 입력 폼이 작고 단순 |
| Styling | Tailwind / CSS Modules / styled-components | CSS Modules + CSS 변수 | 다크 모드를 CSS 변수 테마로 처리, 추가 의존성 없음 (Design에서 최종 확정) |
| Testing | Jest / Vitest / Playwright | Vitest + Testing Library | Vite와 설정 공유, 빠름 |
| Backend | BaaS / Custom Server / Serverless | 없음 | 개인용, 브라우저 저장 |

### 7.3 Clean Architecture Approach

```
Selected Level: Starter (관심사 분리는 유지)

Folder Structure Preview:
┌─────────────────────────────────────────────────────┐
│ src/domain/      할 일 타입, 정렬·필터·검증 순수 함수 │
│ src/storage/     localStorage 저장소, 스키마 검증,   │
│                  손상 복구, JSON 내보내기/가져오기   │
│ src/state/       useReducer 리듀서·액션, Context     │
│ src/components/  TodoInput, TodoList, TodoItem,      │
│                  FilterBar, ThemeToggle, UndoToast   │
│ src/styles/      테마 CSS 변수                       │
└─────────────────────────────────────────────────────┘
의존 방향: components → state → domain,  state → storage → domain
domain은 React·브라우저 API를 모른다 (단위 테스트 대상).
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section — 없음 (Do 단계 시작 시 생성 권장)
- [ ] `docs/01-plan/conventions.md` exists — 없음
- [ ] `CONVENTIONS.md` exists at project root — 없음
- [ ] ESLint configuration — Vite 템플릿 기본값 사용 예정
- [ ] Prettier configuration — 추가 예정
- [ ] TypeScript configuration — Vite 템플릿 기본값 + `strict: true`

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | missing | 컴포넌트 PascalCase, 함수·변수 camelCase, 파일명 = 컴포넌트명 | High |
| **Folder structure** | missing | 7.3 구조, 테스트는 대상 옆 `*.test.ts(x)` | High |
| **Import order** | missing | 외부 → 내부 절대경로 → 상대경로 | Medium |
| **Environment variables** | missing | 없음 (필요 시 `VITE_` 접두사) | Low |
| **Error handling** | missing | 저장소 오류는 Result 형태로 반환, UI에서 토스트 안내 | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| (없음) | 서버·외부 API 없음 | - | ☐ |

### 8.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | `/pipeline-next` |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | `/pipeline-next` |

> 규모가 작아 별도 파이프라인 없이 Design 문서에서 데이터 스키마·컨벤션을 함께 정의한다.

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design todo-app` → `todo-app.design.md`)
2. [ ] 사용자 검토 및 승인
3. [ ] 구현 시작 (`/pdca do todo-app`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-10-12 | Initial draft (Checkpoint 1·2 반영) | biggsman |
