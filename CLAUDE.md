# todo-app

개인용 할 일 웹앱. 데이터는 브라우저 localStorage에만 저장한다 (서버·로그인 없음).

## PDCA 문서

- 계획: `docs/01-plan/features/todo-app.plan.md` (FR-01~14, 성공 기준)
- 설계: `docs/02-design/features/todo-app.design.md` — **구현의 기준(source of truth)**. 함수 시그니처(§4.1), 오류 코드·메시지(§6), 레이어 규칙(§9), 컨벤션(§10)을 그대로 따른다.
- 설계와 다르게 구현해야 하면 임의로 바꾸지 말고 이유를 남긴다. `docs/`, `.bkit/`은 PDCA 도구가 관리한다.

## 스택

- React 19 + Vite 8 + TypeScript 6 (`strict: true`)
- 테스트: Vitest 4 + Testing Library + jsdom, 커버리지 `@vitest/coverage-v8`
- 린트·포맷: ESLint 10 (flat config, typescript-eslint) + Prettier (`eslint-config-prettier`)
- 런타임 의존성은 React와 self-hosted 웹폰트(Geist, Pretendard)뿐. 새 라이브러리는 꼭 필요할 때만 추가한다.

## 명령

| 목적        | 명령                                                             |
| ----------- | ---------------------------------------------------------------- |
| 개발 서버   | `npm run dev`                                                    |
| 테스트 1회  | `npm test`                                                       |
| 테스트 감시 | `npm run test:watch`                                             |
| 커버리지    | `npm run coverage` (domain·storage·state 합산 80% 미만이면 실패) |
| 린트        | `npm run lint`                                                   |
| 타입 체크   | `npm run typecheck`                                              |
| 빌드        | `npm run build` (`tsc -b && vite build`)                         |
| E2E         | `npm run test:e2e` (프로덕션 빌드 + 설치된 Chrome, 포트 4181)    |
| 포맷        | `npm run format` (확인만: `npm run format:check`)                |

작업을 마치기 전에 `lint`, `typecheck`, `test`, `coverage`, `build`, `format:check`, `test:e2e`를 모두 통과시킨다.

## 폴더와 레이어 (설계 §9)

```
src/
  domain/      타입·검증·정렬·필터·마감 규칙 (순수 함수)
  storage/     localStorage 입출력, 스키마 검증, JSON 백업
  state/       todoReducer, TodoContext, useUndo
  components/  UI 컴포넌트 (*.tsx + *.module.css)
  theme/       useTheme, theme.css (`todo-app:theme` 키는 theme/useTheme.ts가 소유)
  test/        setup.ts, factories.ts (makeTodo, makeTodos, makeFixtureTodos)
```

의존 방향: `components/theme → state → domain`, `state → storage → domain`.

| From                | 가능            | 금지                                          |
| ------------------- | --------------- | --------------------------------------------- |
| components/, theme/ | state, domain   | storage                                       |
| state/              | domain, storage | components, theme                             |
| domain/             | 같은 폴더만     | 그 외 전부 (React, window, localStorage 포함) |
| storage/            | domain          | state, components, theme                      |

- ESLint `no-restricted-imports`가 위 규칙을 강제한다 (`eslint.config.js`). 테스트 파일은 예외.
- domain은 시계·난수를 직접 쓰지 않는다. `now: Date`, `id: string`, `today: 'YYYY-MM-DD'`를 인자로 받는다.
- `todo-app:theme` 키는 UI 설정이므로 storage/가 아니라 `theme/useTheme.ts`가 직접 읽고 쓴다 (index.html의 초기 테마 스크립트와 키를 맞춘다). 나머지 키(`todo-app:v1`, `corrupt-backup`, `pre-import-backup`)는 `storage/schema.ts`.
- "오늘" 계산과 날짜 문자열 처리는 `src/domain/date.ts`에서만 한다 (로컬 시간대 기준).

## 컨벤션 (설계 §10)

- 이름: 컴포넌트 PascalCase(`TodoItem.tsx`), 함수·변수 camelCase, 상수 UPPER_SNAKE_CASE, 타입 PascalCase, 유틸 파일 camelCase, 폴더 소문자.
- 테스트는 대상 옆에 `*.test.ts(x)`. 테스트 데이터는 `@/test/factories`를 쓴다.
- import 순서: 외부 라이브러리 → `@/` 내부 → 상대 경로 → `import type` → 스타일. 경로 별칭 `@/` = `src/`.
- 오류: 실패는 `Result<T>`(`{ ok: true, value } | { ok: false, error: { code, message } }`)로 반환하고 UI가 토스트로 안내한다. 예외는 개발자 오류에만 쓴다. 코드별 한국어 메시지는 `src/domain/errors.ts`의 `ERROR_MESSAGES`.
- 상태: `useReducer` + Context. 필터·정렬 결과 같은 파생 데이터는 `useMemo`로 계산하고 저장하지 않는다.
- 스타일: CSS Modules + `theme.css` CSS 변수, `[data-theme="dark"]`에서 재정의.
- 사용자 입력은 React 텍스트 노드로만 렌더링한다 (`dangerouslySetInnerHTML` 금지).
- bkit 주석: 모듈 상단에 `// Design Ref: §N — 이유`, 핵심 로직에 `// Plan SC: …`.
- 포맷: Prettier (`semi: true`, `singleQuote: true`, `printWidth: 100`).
