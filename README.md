# Todo

개인용 할 일 관리 웹앱입니다. 서버나 로그인 없이 브라우저에서만 동작하고, 데이터는 그 브라우저의 `localStorage`에 저장됩니다.

## 기능

- 할 일 추가·완료·수정·삭제 (제목 클릭 또는 Enter로 바로 편집, Esc로 취소)
- 마감일, 우선순위(높음·보통·낮음), 카테고리, 태그
- 마감 지남·오늘 강조, 상태 탭(전체·진행 중·완료), 제목·태그 검색, 카테고리·태그 필터
- 정렬: 마감일순·우선순위순(진행 중인 일이 먼저, 완료한 일은 뒤로), 최신순
- 삭제·완료 항목 일괄 삭제 후 5초 동안 "되돌리기"
- 라이트·다크 모드 (처음엔 시스템 설정을 따르고, 직접 고르면 그 선택을 기억)
- JSON 파일로 내보내기·가져오기, 손상된 저장 데이터 자동 보관 후 새로 시작
- 키보드만으로 모든 기능 사용, 360px 모바일 화면 지원

## 데이터는 이 브라우저에만 저장됩니다

할 일은 지금 쓰는 브라우저 한 곳에만 있습니다. 다른 기기·브라우저와 동기화되지 않고, 브라우저의 사이트 데이터를 지우거나 시크릿 창을 닫으면 사라집니다. 정기적으로 백업하세요.

**백업 (내보내기)**: 오른쪽 위 **데이터 → 내보내기**를 누르면 `todo-app-backup-YYYY-MM-DD.json` 파일이 내려받아집니다.

**복원 (가져오기)**: **데이터 → 가져오기**로 백업 파일을 고르면 "현재 N개를 가져온 M개로 바꿉니다" 확인 창이 뜨고, **바꾸기**를 누르면 목록 전체가 파일 내용으로 바뀝니다.

- 5MB가 넘는 파일, JSON이 아닌 파일, 이 앱의 백업 형식이 아닌 파일은 거부하며 기존 데이터는 그대로입니다.
- 바꾸기 직전의 목록은 브라우저 안의 `todo-app:pre-import-backup` 키에 자동으로 보관됩니다(가져올 때마다 가장 최근 것 하나로 덮어쓰며, 자동으로 지우지 않습니다). 이 보관에 실패하면(저장 공간 부족 등) 가져오기를 취소합니다.
- 저장된 데이터가 손상돼 읽을 수 없으면 원본을 `todo-app:corrupt-backup` 키에 보관한 뒤 빈 목록으로 시작하고 안내합니다. 이미 다른 손상 원본이 보관돼 있거나 보관에 실패하면 그 사실을 따로 알리고, 할 일을 처음 바꾸기 전까지는 원래 키의 데이터를 덮어쓰지 않습니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

## 명령

| 목적           | 명령                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| 개발 서버      | `npm run dev`                                                                       |
| 단위·UI 테스트 | `npm test` (감시 모드: `npm run test:watch`)                                        |
| 커버리지       | `npm run coverage` — `domain`·`storage`·`state` 합산 80% 미만이면 실패              |
| E2E 테스트     | `npm run test:e2e` — 프로덕션 빌드를 띄워 설치된 Chrome(`channel: chrome`)으로 실행 |
| 린트           | `npm run lint`                                                                      |
| 타입 체크      | `npm run typecheck`                                                                 |
| 빌드           | `npm run build` (결과물: `dist/`, 확인: `npm run preview`)                          |
| 포맷           | `npm run format` (확인만: `npm run format:check`)                                   |

E2E는 Playwright 브라우저를 따로 내려받지 않고 PC에 설치된 Google Chrome을 사용합니다. 포트 4181에서 미리보기 서버를 띄웁니다.

## 구조

React 19 + Vite + TypeScript(strict). 런타임 의존성은 React와 웹폰트뿐이고, 상태는 `useReducer` + Context, 스타일은 CSS Modules + `src/theme/theme.css`의 CSS 변수입니다.

```
src/
  domain/      할 일 타입, 검증, 정렬·필터, 마감 계산, 오류 메시지 — 순수 함수 (React·브라우저 API 없음)
  storage/     localStorage 읽기·쓰기, 스키마 검증, 내보내기·가져오기 파일 형식, 백업
  state/       todoReducer, TodoContext(불러오기·자동 저장·액션), useUndo
  components/  화면 컴포넌트와 UI 전용 훅 (*.tsx + *.module.css)
  theme/       useTheme, theme.css (디자인 토큰, 라이트·다크)
  test/        테스트 데이터 팩토리, 가짜 Storage, matchMedia 목
e2e/           Playwright 시나리오 (설계 §8.4)
```

의존 방향은 바깥에서 안쪽으로만 향합니다: `components·theme → state → domain`, `state → storage → domain`. 화면 코드는 `storage/`를 직접 쓰지 않고 `useTodoActions()`를 거칩니다. 이 규칙은 ESLint(`no-restricted-imports`)가 검사합니다.

## 문서

- 계획 (요구사항 FR-01~14, 성공 기준): [`docs/01-plan/features/todo-app.plan.md`](docs/01-plan/features/todo-app.plan.md)
- 설계 (인터페이스, 오류 코드, 테스트 계획): [`docs/02-design/features/todo-app.design.md`](docs/02-design/features/todo-app.design.md)
- 개발 규칙: [`CLAUDE.md`](CLAUDE.md)

## 배포 / 설치

- 주소: https://biggsman.github.io/todo-app/ (`master`에 push하면 GitHub Actions가 자동 배포)
- 휴대폰: 주소를 연 뒤 브라우저 메뉴에서 **홈 화면에 추가** (iOS Safari: 공유 → 홈 화면에 추가)
- PC (Chrome/Edge): 주소창 오른쪽의 **설치** 아이콘
- 한 번 연 뒤에는 인터넷 없이도 열린다 (PWA). 데이터는 기기·브라우저마다 따로 저장되므로, 기기 간 이동은 데이터 메뉴의 내보내기/가져오기를 쓴다. 가져오기는 현재 목록에 **합친다** (같은 할 일은 더 최근에 수정된 쪽을 남기고, 삭제는 전파되지 않는다).
