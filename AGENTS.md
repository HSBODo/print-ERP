# App Template — 코딩 표준 및 규칙

> ⚠️ 이 문서와 [`CLAUDE.md`](CLAUDE.md)는 **동일한 프로젝트 표준**을 공유한다. 구조·컨벤션을 바꾸면 **둘 다** 갱신할 것.

Spring Boot + React 관리자형 웹앱 템플릿. 로그인·JWT·롤×부서 권한·계정 관리·사이드바 레이아웃만 들어 있고,
업무 기능은 프로젝트마다 도메인 단위로 추가한다.

## 기술 스택

- **백엔드**: Java 21 / Spring Boot 3.5 / Gradle · Spring Security + JWT (jjwt, HMAC-SHA256) · JPA + JdbcTemplate
- **DB**: PostgreSQL (프로파일 local/dev/prod) · 스키마는 Flyway(`db/migration/V*.sql`) · H2 는 테스트 전용
- **API 문서**: REST Docs + restdocs-api-spec → OpenAPI 3 → Swagger UI (`/docs/`)
- **프론트엔드**: React 19 / TypeScript / Vite 8
- **UI**: Tailwind CSS 4 + shadcn/ui (base-nova 테마) + Recharts
- **상태관리**: Zustand (세션) + TanStack Query (서버 상태)
- **HTTP**: axios (`shared/api/client.ts` 인스턴스 1개)
- **라우팅**: TanStack Router (파일 기반)
- **폼**: react-hook-form + Zod
- **언어**: 한국어 UI

## 새 프로젝트 시작 체크리스트

1. 이름 바꾸기
   - 백엔드 패키지 `com.example.app` → 프로젝트 패키지 (폴더 이동 + `package`/`import` 일괄 치환)
   - `backend/settings.gradle` `rootProject.name`, `build.gradle` `group`·`description`·`openapi3.title`
   - `application.yml` `spring.application.name`
   - 프론트 `frontend/src/shared/constants/app.ts` (`APP_NAME`·`APP_INITIAL`·`APP_COPYRIGHT_OWNER`), `frontend/index.html` `<title>`
   - `docker-compose.yml` 이미지 이름
2. 부서 정의 — 예시 값 `TEAM_A`·`TEAM_B` 를 실제 부서로 교체 (아래 "권한" 참고)
3. `cp backend/.env.example backend/.env` 후 JWT 시크릿·DB·관리자 시드 값 설정
4. 운영 첫 배포: `APP_SEED_ENABLED=true` + `APP_SEED_ADMIN_PASSWORD`(8자 이상)로 첫 관리자를 만들고, 이후 `false` 로 되돌린다

## 디렉토리 구조

```
project-root/
├── backend/
│   ├── src/main/java/com/example/app/
│   │   ├── Application.java
│   │   ├── auth/       # 로그인/JWT/사용자 — config(SecurityConfig·JwtUtil·DataInitializer)·controller·service·repository·dto·entity(User·Role·Department)
│   │   └── common/     # config(JpaAuditing)·dto(ApiResponse·ErrorResponse·PageResponse)·entity(BaseEntity)·exception(@RestControllerAdvice)·util(SqlLoader)·web(Health·SpaForward·DocsRedirect)
│   ├── src/main/resources/
│   │   ├── application.yml            # 공통 (datasource·JPA·JWT·CORS·시드)
│   │   ├── application-{local,dev,prod}.yml
│   │   ├── db/migration/V*.sql         # Flyway — 스키마 정본 (V1__create_users.sql)
│   │   └── static/docs/index.html     # Swagger UI 런처
│   └── build.gradle
├── frontend/
│   ├── src/
│   │   ├── main.tsx · App.tsx         # 진입점 · QueryClientProvider + RouterProvider
│   │   ├── routeTree.gen.ts           # router-plugin 생성 (커밋 대상 · 직접 수정 금지)
│   │   ├── routes/                    # [page] 파일 기반 라우트 + staticData.page(메타·권한)
│   │   │   ├── __root.tsx · login.tsx
│   │   │   └── _auth/                 # 인증 레이아웃 — route.tsx(beforeLoad: 인증 + 접근 판정) · index.tsx(HOME)
│   │   │       ├── -internal/         # 앱 셸: layout/(AppLayout·Sidebar·Topbar) · navigation.ts(MENU_TREE) · pageAccess.ts · RouteGate · Forbidden · StatsPlaceholderPage
│   │   │       └── admin/accounts.tsx # 계정 관리
│   │   ├── composition/dashboard/     # 메인 대시보드 (여러 도메인 조합 화면)
│   │   ├── domain/
│   │   │   ├── core/<domain>/         # api.ts · type/api.ts(zod) · hooks/ · ui/<Screen>/ · utils/  (현재: auth · account)
│   │   │   └── support/session/       # 세션·권한 — store(Zustand) · session · initApiClient · utils/access(hasAccess)
│   │   └── shared/                    # 도메인 무관 공용 — api · ui(shadcn 포함) · hooks · utils · constants
│   └── vite.config.ts                 # 프록시: /api·/docs → localhost:18080
├── docker/entrypoint.sh
├── Dockerfile                         # 프론트+백엔드 한 이미지
└── docker-compose.yml                 # app + postgres
```

프론트 레이어 규칙 정본은 [`.claude/docs/ARCHITECTURE.md`](.claude/docs/ARCHITECTURE.md) · [`CONVENTION.md`](.claude/docs/CONVENTION.md)
(경계는 eslint-plugin-boundaries 가 강제). page → composition → domain/core → domain/support → entity → shared.
core 끼리 import 금지 — 여러 도메인을 모으는 화면은 composition 으로.

## 권한 (롤 × 부서)

| 롤 \ 부서 | ALL | TEAM_A · TEAM_B (예시) |
|---|---|---|
| **ADMIN** | ✅ 전권 (계정 관리) | 🚫 |
| **DIRECTOR** | ✅ 모든 부서 열람 (시스템 조작 X) | 🚫 |
| **MANAGER** | 🚫 | ✅ 부서 관리자 |
| **STAFF** | 🚫 | ✅ 실무자 |

- 조합 검증: 백엔드 `User.isValidCombination` + 프론트 `UserFormDialog` Zod.
- JWT 는 "누구인지"만 증명한다. `JwtAuthenticationFilter` 가 요청마다 DB 에서 사용자를 다시 읽어 **현재** 롤·부서로
  authority `ROLE_<ROLE>`·`DEPT_<DEPARTMENT>` 를 만든다 → 삭제된 계정 토큰은 즉시 401, 강등은 즉시 403.
- 프론트 게이팅: 라우트 `staticData.page.access` (`{ role: 'ADMIN' }` · `{ role: 'EXECUTIVE' }` · `{ department }`) →
  `hasAccess`(domain/support/session/utils/access.ts) → `canAccess`(routes/_auth/-internal/pageAccess.ts). 라우트 차단과 사이드바가 같은 규칙을 쓴다.
- 백엔드 게이팅: `SecurityConfig` — `/api/admin/**` = ADMIN, 나머지 `/api/**` = 인증. 부서 전용 API 는 `/api/**` 매처 앞에
  `hasAnyAuthority("DEPT_TEAM_A", "DEPT_ALL")` 로 추가하고 프론트 `access` 와 대칭을 유지한다.
- **부서 이름을 바꿀 때 함께 고칠 곳**: `Department.java` · `session.ts`(UserDepartment·KNOWN_DEPARTMENTS·기본값) ·
  `domain/core/auth/type/api.ts` · `domain/core/account/type/api.ts` · `AccountManagementPage`(옵션·배지) · `UserFormDialog` · `Topbar/label.ts` · `User.java` 컬럼 DEFAULT.

## 백엔드 컨벤션

### API

```
POST   /api/auth/login              # 로그인 (공개)
GET    /api/health                  # 헬스체크 (공개)
GET    /api/admin/users             # 계정 목록 (ADMIN)
GET    /api/admin/users/{id}
POST   /api/admin/users             # 신규 (loginId·email·name·role·department·password)
PUT    /api/admin/users/{id}        # 수정 (loginId 불변, password 빈 값이면 유지 · 자기 롤·부서 변경 400)
DELETE /api/admin/users/{id}        # 삭제 (본인·마지막 ADMIN 400)
```

### 응답 포맷

```json
// 성공 (ApiResponse<T>)
{ "success": true, "data": { ... } }

// 에러 (ErrorResponse)
{ "success": false, "status": 401, "message": "인증이 필요합니다.", "errors": { "field": "메시지" }, "timestamp": "..." }
```

### 코딩 스타일

- 도메인 중심 패키지: `<domain>/{controller,service,repository,dto,entity}`
- Entity 에 `@Setter` 금지 — 의미 있는 메서드로 상태 변경 · 감사 컬럼이 필요하면 `BaseEntity` 상속
- 엔티티·컬럼을 추가하면 `db/migration/V{n}__설명.sql` 을 함께 추가한다 (Hibernate 는 `validate` 만 한다 — 빠뜨리면 기동 실패)
- DTO <-> Entity: 정적 팩토리 (`XxxResponse.from(entity)`)
- 예외: `@RestControllerAdvice`(`GlobalExceptionHandler`) + 커스텀 예외 클래스
- Validation: `@Valid` + Bean Validation
- SQL 은 `resources/sql/<domain>/*.sql` 리소스로 두고 `SqlLoader` 로 읽는다. 파라미터 바인딩 필수 (문자열 결합 금지)
- 테스트 메서드명 한글 허용 · 문서화 테스트(`*DocsTest`)가 OpenAPI 스펙을 만든다
- Lombok: `@RequiredArgsConstructor`, `@Builder`, `@Getter` 허용 / `@Setter` 금지

### 새 API 추가 순서

1. DTO (`<domain>/dto`) → 2. Repository → 3. Service → 4. Controller
5. `SecurityConfig` 매처 (부서 전용이면) · `*DocsTest` 로 문서화
6. 프론트 `domain/core/<domain>/` 에 `type/api.ts`(zod) + `api.ts` + `hooks/` + `ui/<Screen>/`

화면 경로 새로고침은 `SpaForwardController` 가 자동 처리한다 — 첫 경로 조각이 `api`·`docs`·`webjars`·`assets`·`error` 가 아니면 index.html 로 포워드.

## 프론트엔드 컨벤션

### 라우팅

- TanStack Router 파일 기반. `routeTree.gen.ts` 는 vite 플러그인이 생성(커밋 대상).
- 파일명 규칙: `_xxx` = 경로 없는 레이아웃 · `(xxx)` = URL 에 안 붙는 폴더 묶음 · `-xxx` = 라우트 아님 · `$xxx` = 경로 파라미터.
- **새 페이지 연결**:
  1. `domain/core/<domain>/ui/<Screen>/index.tsx` 에 화면 작성 (여러 도메인을 모으면 `composition/`)
  2. `routes/_auth/<path>.tsx` 라우트 파일 — `component` + `staticData.page`(id·label·section·status·access)
  3. `routes/_auth/-internal/navigation.ts` `MENU_TREE` 에 경로 추가 (숨길 거면 `HIDDEN_PAGE_PATHS`)
- 메뉴에도 숨김 목록에도 없는 페이지 라우트는 `navigation.test.ts` 가, `staticData.page` 누락은 `routeTree.test.ts` 가 막는다.
- `status: 'pending'` 페이지: 개발 빌드는 미리보기(사이드바 빨강), 운영 빌드는 사이드바 숨김 + `StatsPlaceholderPage` 로 차단.

### API 연동

- `shared/api/client.ts` 의 axios 인스턴스 `api` 사용 — 토큰 부착·401 세션 만료는 `support/session/initApiClient` 가 등록.
- `const { data } = await api.get(path, { params, signal })` 후 zod 로 파싱. 도메인 `hooks/` 에서 `useQuery` 로 캐싱.

### 조회 필터

- 서버 요청 조건은 `useFilter`(`shared/hooks/useFilter`) + `Filter.*` 컴포넌트. 받아온 행을 화면에서 거르는 조건은 `useState`.
- 날짜 계산은 `#shared/utils/date`(로컬 시간). `toISOString()` 으로 날짜를 만들지 않는다.

### 차트 · 숫자

- 차트는 shadcn `ChartContainer` + `ChartTooltip`, 색은 `shared/constants/chart.ts` 팔레트.
- 금액 `1,234,567원` · 퍼센트 `83.3%` · 건수 `1,234건` · 증감 `▲ +5.9%`(초록) / `▼ -3.2%`(빨강).

### shadcn 컴포넌트 추가

```bash
cd frontend && npx shadcn@latest add <component-name>
```

## 실행 명령어

```bash
# 전체 (app + postgres) — http://localhost:18080
cp backend/.env.example backend/.env
docker compose up -d --build

# 개발
docker compose up -d postgres                                              # DB 만
cd backend && ./gradlew bootRun --args='--spring.profiles.active=local'     # Backend :18080 (bootRun 이 backend/.env 를 자동 주입)
cd frontend && npm run dev                                                  # Frontend :15173 (Node 20+)

# 빌드/테스트
cd backend && ./gradlew test                 # 백엔드 테스트
cd backend && ./gradlew test openapi3        # + OpenAPI 스펙 생성
cd frontend && npm run build                 # 프로덕션 빌드
cd frontend && npm run lint                  # ESLint (레이어 경계 포함)
cd frontend && npm run test                  # Vitest
cd frontend && npm run storybook             # Storybook
```

## 공통 규칙

- 커밋: `feat: 주문 목록 화면 구현`, `fix: 합계 소수점 오류`
- **KISS · DRY · YAGNI**, 파일 500줄 · 함수 50줄 이하 유지
- 하드코딩된 비밀번호/키 금지 — 시크릿은 `backend/.env`(gitignored) 또는 배포 환경변수
- 사용자 입력 검증 필수 (`@Valid`, Zod) · SQL 파라미터 바인딩 필수
- 스키마 변경은 Flyway 마이그레이션으로만 — 이미 적용된 V 파일은 수정하지 말고 새 버전을 추가한다
- 프론트 환경변수는 `VITE_` 접두사
