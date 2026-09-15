# B&VIIT Analytics Dashboard — 코딩 표준 및 규칙

> ⚠️ 이 문서와 [`CLAUDE.md`](CLAUDE.md)는 **동일한 프로젝트 표준**을 공유한다. 구조·컨벤션을 바꾸면 **둘 다** 갱신할 것(한쪽만 고치면 에이전트 지침이 어긋난다).

## 프로젝트 개요

- **목적**: 안과(B&VIIT) KPI 대시보드 및 데이터 시각화 플랫폼
- **백엔드**: Java 21 / Spring Boot 3.5 / Gradle
- **프론트엔드**: React 19 / TypeScript / Vite 8
- **UI**: Tailwind CSS 4 + shadcn/ui (base-nova 테마) + Recharts
- **상태관리**: Zustand (인증) + TanStack Query (서버 상태)
- **라우팅**: TanStack Router
- **폼**: react-hook-form + Zod
- **DB**: H2 (개발, 기본) / PostgreSQL 마트 (`application-postgres-mart.yml`, 배치 시점에 CRM MSSQL 을 읽어 적재)
- **인증**: Spring Security + JWT (jjwt, HMAC-SHA256)
- **언어**: 한국어 UI

## 디렉토리 구조

```
project-root/
├── backend/
│   ├── src/main/java/com/bviit/analytics/
│   │   ├── AnalyticsApplication.java
│   │   ├── auth/                        # 로그인/JWT/사용자 계정
│   │   │   ├── config/                  # SecurityConfig, JwtUtil, DataInitializer
│   │   │   ├── controller/              # POST /api/auth/login
│   │   │   ├── dto/
│   │   │   ├── entity/
│   │   │   ├── repository/
│   │   │   └── service/
│   │   ├── common/                      # 공통 응답, 예외, 설정, 유틸, 통계 helper
│   │   │   ├── config/
│   │   │   ├── dto/
│   │   │   ├── exception/
│   │   │   ├── stats/
│   │   │   ├── util/
│   │   │   └── web/
│   │   ├── reservation/                 # 예약/예약통계/변경이력(RESERVE_HISTORY 체인)/스냅샷/진단
│   │   ├── exam/                        # 검사 통계 및 검사자 리스트
│   │   ├── surgery/                     # 수술 통계 및 수술 리스트
│   │   ├── consultation/                # 상담/전환율/중단사유
│   │   ├── outpatient/                  # 외래/내원 관련 통계
│   │   ├── overall/                     # 종합 주간 지표
│   │   └── etc/                         # B2B 매출 · 드림렌즈 장부(직접 입력 CRUD) 등 기타
│   ├── src/main/resources/
│   │   ├── application.yml                  # 공통 + 프로파일 그룹 ({local|dev|prod} → postgres-mart 포함)
│   │   ├── application-local.yml            # 로컬 개발 (H2, 배치 비활성)
│   │   ├── application-dev.yml              # 개발 서버 (Postgres 마트 + MSSQL 배치)
│   │   ├── application-prod.yml             # 운영 (Postgres 마트 + MSSQL 배치)
│   │   └── application-postgres-mart.yml    # 마트 인프라 — 위 셋에 group include
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # 진입점 (React 렌더)
│   │   ├── App.tsx                      # QueryClientProvider + RouterProvider
│   │   ├── router.tsx                   # TanStack Router (인증 가드 포함)
│   │   ├── index.css                    # Tailwind 4 + OKLCH 테마 변수
│   │   ├── api/
│   │   │   ├── client.ts               # HTTP 클라이언트 (Bearer 토큰 자동 주입)
│   │   │   └── auth.ts                 # 로그인 API
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx        # 인증 레이아웃 (Topbar + Sidebar + Outlet)
│   │   │   │   ├── Sidebar.tsx          # 접이식 네비게이션 (navigation.ts 기반)
│   │   │   │   └── Topbar.tsx           # 상단 바 (유저명, 로그아웃)
│   │   │   └── ui/                      # shadcn 컴포넌트 (button, card, chart)
│   │   ├── config/
│   │   │   ├── statsPages.ts            # 통계 페이지 정의
│   │   │   └── navigation.ts            # 메뉴 구조 + 구현 상태 맵
│   │   ├── pages/
│   │   │   ├── accounting/              # 회계 5종 (진료 수납·시력교정 매출 내역·집계·그래프 2종 — /api/accounting 마트 조회 · ADMIN)
│   │   │   ├── LoginPage.tsx            # 로그인 (react-hook-form + Zod)
│   │   │   ├── DashboardPage.tsx        # 메인 대시보드 (KPI 카드 + 차트, 목업 데이터)
│   │   │   ├── ReservationPage.tsx      # 예약 비교 (TanStack Query API 연동)
│   │   │   └── StatsPlaceholderPage.tsx # 미구현/보류 통계 페이지 템플릿
│   │   ├── stores/
│   │   │   └── authStore.ts             # Zustand 인증 (token + user, localStorage 연동)
│   │   ├── lib/
│   │   │   └── utils.ts                # cn() (clsx + tailwind-merge)
│   │   └── test/
│   │       └── setup.ts                # Vitest + @testing-library/jest-dom
│   ├── components.json                  # shadcn CLI 설정
│   ├── vite.config.ts                   # 프록시: /api → localhost:8080
│   └── package.json
│
├── docker-compose.local.yml              # 로컬 개발용 Compose (기본 사용)
├── Dockerfile.local                      # 로컬 개발용 이미지 (Infisical 미사용)
├── docker-compose.yml                    # 운영/Jenkins용 Compose
├── Dockerfile                            # 운영/Jenkins용 이미지
└── AGENTS.md
```

## 현재 구현 상태

### 구현 완료

- JWT 기반 로그인/인증 (백엔드 + 프론트)
- 메인 대시보드 레이아웃 (Sidebar + Topbar + Content)
- DashboardPage (KPI 카드 4개 + 차트 5개, 하드코딩 목업)
- ReservationPage (월별/연도별 비교, TanStack Query API 연동)
- 예약통계_시력교정 / 예약통계_백내장 (스냅샷 우선 + MSSQL 라이브 집계)
- 예약자 리스트 및 주요 예약/검사/상담/수술 통계 API 일부
- 회계 5종 (진료 수납·시력교정 매출 내역·매출 집계·매출 그래프 2종 — 2026-09-15 마트 `list_medical_receipt`·`mart_medical_receipt_monthly`·`list_vision_receipt` + `/api/accounting` · 배치 도메인 `ACCOUNTING` · 의사랑은 링크드서버 OPENQUERY(`common/util/OpenQuerySql`) · ADMIN 전용)
- 회계 정합성: 진료 행·집계는 월 전체를 함께 교체하고 `rows_complete`로 월별 조회 경로를 선택한다. 회계만 매월 2023년부터 과거 이력을 재검산하며, 진료 부분 실패는 성공 데이터 보존 + FAILED 이력으로 처리한다 (`docs/accounting/mart-and-api.md`).
- 해외마케팅 3종 (접수리스트·통계·예약통계 · `/api/overseas-marketing` · 마트 `overseas_marketing_sheet`/`overseas_reservation_stats` · 2026-09-09 `2026-08-14` 브랜치에서 이관 · MARKETING 부서 전용)
- 인증 라우트 가드 (미인증 시 /login 리다이렉트)

### 미구현 (플레이스홀더)

일부 통계 페이지. 전체 페이지 목록의 기준은 `frontend/src/config/statsPages.ts`.

## 대표 통계 페이지 목록

실제 전체 목록과 라우팅 기준은 `frontend/src/config/statsPages.ts`와 `frontend/src/pages/pageRegistry.ts`를 우선한다.

| ID | 이름 | 경로 | 섹션 | 상태 |
|----|------|------|------|------|
| reservation | 예약 건수 | /stats/reservation | 유입 | 구현됨 (API 연동) |
| reservation-change | 예약 변경이력 | /stats/reservation-change | 예약 | 구현됨 (RESERVE_HISTORY 체인 → `list_reservation_change` 마트 · 변경 상세 탭 + 추이 달력 탭) |
| examination | 검사 건수 | /stats/examination | 유입 | 플레이스홀더 |
| consultation-rate | 상담 전환율 | /stats/consultation-rate | 상담 | 플레이스홀더 |
| surgery | 수술 건수 | /stats/surgery | 수술 | 플레이스홀더 |
| surgery-ratio | 주요 수술별 비중 | /stats/surgery-ratio | 수술비중 | 플레이스홀더 |
| overseas-marketing-receptions | 접수리스트 | /stats/overseas-marketing/receptions | 해외마케팅 | 구현됨 (Google Sheet 캐시 + 수기 입력 · CRM 매칭 3단계 · MARKETING 전용) |
| overseas-marketing-statistics | 통계 | /stats/overseas-marketing/statistics | 해외마케팅 | 구현됨 (월별 유입→검사·수술 흐름 · 국가별 · 매출) |
| overseas-reservation-stats | 예약통계 | /stats/overseas-marketing/reservation-stats | 해외마케팅 | 구현됨 (레거시 시드 + 접수리스트 자동 집계 · 일간 셀 수정) |
| marketing | 마케팅 유입 및 효율 | /stats/marketing | 마케팅 | 플레이스홀더 |
| cancel-rate | 예약취소율 | /stats/cancel-rate | 기타 | 플레이스홀더 |
| no-show-rate | 부도율 | /stats/no-show-rate | 기타 | 플레이스홀더 |
| unit-price | 객단가 | /stats/unit-price | 기타 | 플레이스홀더 |
| accounting-medical | 진료 수납 | /accounting/medical-receipts | 회계 | 완료 (관리자 전용 · `list_medical_receipt` 2026~) |
| accounting-vision | 시력교정 매출 내역 | /accounting/vision-revenue | 회계 | 완료 (관리자 전용 · `list_vision_receipt` 2023~) |
| accounting-vision-summary | 시력교정 매출 집계 | /accounting/vision-revenue-summary | 회계 | 완료 (관리자 전용 · 피벗은 화면에서 접음) |
| accounting-vision-chart | 시력교정 매출 그래프 | /accounting/vision-revenue-chart | 회계 | 완료 (관리자 전용) |
| accounting-medical-chart | 진료 매출 그래프 | /accounting/medical-revenue-chart | 회계 | 완료 (관리자 전용 · 2026~ 행 재집계+구분 · 그 전 `mart_medical_receipt_monthly`) |

## 백엔드 컨벤션

### API 설계

```
POST   /api/auth/login                              # 로그인 (구현됨)

# 통계 API (구현 예정)
GET    /api/stats/{pageId}                           # 통계 데이터 조회
GET    /api/stats/{pageId}/trend?period=MONTHLY&from=2025-01&to=2025-12
GET    /api/stats/{pageId}/compare?compareTo=PREVIOUS_PERIOD
```

### 응답 포맷

```json
// 성공 (ApiResponse<T>)
{
  "success": true,
  "data": { ... }
}

// 에러 (ErrorResponse)
{
  "success": false,
  "status": 401,
  "message": "인증이 필요합니다.",
  "errors": { "field": "메시지" },   // validation 에러 시에만
  "timestamp": "2026-04-11T..."
}
```

### 코딩 스타일

- 패키지: `com.bviit.analytics`
- 백엔드는 도메인 중심 패키지를 기본으로 한다. 예: `reservation/controller`, `reservation/service`, `reservation/repository`, `reservation/dto`.
- 인증은 `auth`, 공통 응답/예외/유틸/통계 helper는 `common` 아래에 둔다.
- Entity에 `@Setter` 금지 — 의미 있는 메서드로 상태 변경
- DTO <-> Entity: 정적 팩토리 (`XxxResponse.from(entity)`)
- 예외: `@RestControllerAdvice` + 커스텀 예외 클래스
- Validation: `@Valid` + Bean Validation (`@Email`, `@NotBlank` 등)
- 테스트 메서드명 한글 허용: `예약_건수_정상조회()`
- SQL 파라미터 바인딩 필수 (문자열 결합 절대 금지)
- Lombok: `@RequiredArgsConstructor`, `@Builder`, `@Getter` 허용 / `@Setter` 금지

### 신규 통계 API 추가 순서

1. 도메인 패키지 선택 또는 생성 (`reservation/`, `exam/`, `surgery/` 등)
2. Entity/DTO 정의 (`<domain>/entity`, `<domain>/dto`)
3. Repository 작성 (`<domain>/repository`)
4. Service 비즈니스 로직 (`<domain>/service`)
5. Controller 엔드포인트 (`<domain>/controller`)
6. 프론트 API 함수 + 페이지 연결

## 프론트엔드 컨벤션

### 라우팅 패턴

- 인증 필요 페이지는 `authLayout` 하위에 등록 (`router.tsx`)
- 새 통계 페이지: `config/statsPages.ts`에 정의 → `config/navigation.ts` 상태/메뉴 반영 → 도메인 `routes.ts`에 전용 컴포넌트 등록
- 미구현 페이지는 `StatsPlaceholderPage`로 자동 렌더링
- 새 페이지 추가 시 `filter` 제거: `router.tsx`에서 해당 ID의 플레이스홀더를 전용 컴포넌트로 교체

### 차트 (Recharts)

- 모든 차트는 shadcn `ChartContainer` + `ChartTooltip`으로 감싸서 테마 통일
- 차트 설정은 `chartConfig` 객체로 정의 (색상, 라벨)
- 참고 구현: `DashboardPage.tsx`, `ReservationPage.tsx`

### 색상 체계

```typescript
// KPI 상태별 색상
const STATUS_COLORS = {
  DANGER:  '#EF4444',   // red-500
  WARNING: '#F59E0B',   // amber-500
  GOOD:    '#10B981',   // emerald-500
  NEUTRAL: '#6B7280',   // gray-500
}

// 추세 색상
const TREND_COLORS = {
  POSITIVE: '#10B981',  // 좋은 추세 (초록)
  NEGATIVE: '#EF4444',  // 나쁜 추세 (빨강)
  FLAT:     '#6B7280',  // 변동 없음 (회색)
}

// 차트 팔레트 (최대 8개 시리즈)
const CHART_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]
```

### 숫자 포맷 규칙

- 금액: `1,234,567,890원` / 축약 시 `12.3억`
- 퍼센트: `83.3%` (소수점 1자리)
- 건수: `1,234건`
- 증감률: `▲ +5.9%` (초록) / `▼ -3.2%` (빨강) / `— 0.0%` (회색)

### 상태관리

```
authStore (Zustand)     — 인증: token, user, login/logout (localStorage 연동)
filterStore (Zustand)   — 글로벌 필터: 기간, 부서, 카테고리 (구현 예정)
TanStack Query          — 서버 데이터 캐싱/갱신
```

### shadcn 컴포넌트 추가

```bash
cd frontend && npx shadcn@latest add <component-name>
```

설정: `frontend/components.json` (base-nova 테마, Lucide 아이콘)

## 실행 명령어

```bash
# 로컬 도커 컴포즈 (기본 · backend + frontend 정적 파일 한 컨테이너)
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml down

# 운영/Jenkins용 docker-compose.yml · Dockerfile 은 명시적으로 요청받은 경우에만 사용

# 로컬 개별 실행 (개발용)
cd backend && ./gradlew bootRun          # Backend (H2 인메모리 기본, 프로파일 SPRING_PROFILES_ACTIVE 로 조정)
cd frontend && npm run dev               # Frontend (Vite dev server)

# 빌드/테스트
cd frontend && npm run build             # 프로덕션 빌드
cd frontend && npm run lint              # ESLint
cd frontend && npm run test              # Vitest
```

## 공통 규칙

### Git

- 커밋: `feat: 예약 통계 페이지 구현`, `fix: 달성률 소수점 계산 오류`
- **커밋·푸시는 작업 브랜치 `2026-09-04` 안에서만 한다** (`git push origin 2026-09-04`).
- 🚫 **`main`·`develop` 으로 임의 push·PR 금지** — 운영 반영은 **개발자와 협의**해서 진행한다.
  (자세한 배경은 `CLAUDE.md` 의 같은 항목 참조)

### 코드 품질

- **KISS**: 가장 단순한 해결책 선택
- **DRY**: 중복 코드는 함수로 추출
- **YAGNI**: 필요하지 않은 기능 미리 구현 금지
- 파일 500줄 이하 유지, 함수 50줄 이하 유지

### 보안

- 하드코딩된 비밀번호/키 금지 (운영 환경에서 JWT 시크릿 반드시 교체)
- 콘솔에 민감 정보 출력 금지
- 사용자 입력 필수 검증 (`@Valid`, Zod)
- SQL 파라미터 바인딩 필수

### 환경 설정

- `application-local.yml`은 환경변수 참조만 담음 — 시크릿은 `backend/.env`(gitignored)에 두고 실행 스크립트가 주입
- **로컬 Docker 작업은 항상 `docker-compose.local.yml`과 `Dockerfile.local`을 기본으로 사용한다.** `docker-compose.yml`과 `Dockerfile`은 운영/Jenkins용이므로 개발자가 명시적으로 요청하지 않는 한 실행하거나 수정하지 않는다.
- 로컬 Compose도 사내 Nexus나 `backend/.env`에 지정된 외부 데이터 소스에 연결할 수 있다. 여기서 "로컬"은 완전한 오프라인 환경이 아니라 Infisical 없이 로컬 전용 Docker 설정으로 실행한다는 뜻이다.
- 프론트 환경변수: `VITE_` 접두사 사용
- Vite 프록시: `/api` → `http://localhost:8080` (`vite.config.ts`)

## Codex에게 요청할 때 참고사항

- **새 통계 페이지**: `statsPages.ts`에 페이지 정의 → `navigation.ts` 상태/메뉴 반영 → 전용 페이지 컴포넌트 작성 + 도메인 `routes.ts` 등록 + 백엔드 API 구현
- **새 차트**: Recharts 기반, shadcn `ChartContainer` 사용, `CHART_PALETTE` 색상 적용
- **새 UI 컴포넌트**: `npx shadcn@latest add <name>` (설정: `components.json`)
- **API 연동**: `api/client.ts` HTTP 클라이언트 사용, TanStack Query `useQuery`로 캐싱
- **DashboardPage 데이터는 하드코딩 목업**이며, `ReservationPage`는 API 연동 상태다.
