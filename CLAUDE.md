# B&VIIT Analytics Dashboard — 코딩 표준 및 규칙

> ⚠️ 이 문서와 [`AGENTS.md`](AGENTS.md)는 **동일한 프로젝트 표준**을 공유한다. 구조·컨벤션을 바꾸면 **둘 다** 갱신할 것(한쪽만 고치면 에이전트 지침이 어긋난다).

## 프로젝트 개요

- **목적**: 안과(B&VIIT) KPI 대시보드 및 데이터 시각화 플랫폼
- **백엔드**: Java 21 / Spring Boot 3.5 / Gradle
- **프론트엔드**: React 19 / TypeScript / Vite 8
- **UI**: Tailwind CSS 4 + shadcn/ui (base-nova 테마) + Recharts
- **상태관리**: Zustand (인증) + TanStack Query (서버 상태)
- **라우팅**: TanStack Router
- **폼**: react-hook-form + Zod
- **DB**: H2 (개발, 기본) / PostgreSQL (운영, `application-postgres.yml`)
- **인증**: Spring Security + JWT (jjwt, HMAC-SHA256)
- **언어**: 한국어 UI

## 디렉토리 구조

```
project-root/
├── backend/
│   ├── src/main/java/com/bviit/analytics/
│   │   │                                # 도메인 중심 패키지: <domain>/{controller,service,repository,dto}
│   │   ├── AnalyticsApplication.java
│   │   ├── auth/                        # 로그인/JWT/사용자 — config(SecurityConfig·JwtUtil·DataInitializer)·controller·service·repository·dto·entity(User)
│   │   ├── common/                      # 공통 — config·dto(ApiResponse·ErrorResponse)·exception(@RestControllerAdvice)·stats(StatsPanelSupport·StatsRequestValidator·StatsResponseMeta)·util(MonthlyBuckets 등)·web
│   │   ├── reservation/                 # 예약·예약통계(시력교정/백내장)·스냅샷·진단
│   │   ├── exam/                        # 검사 통계·검사자 리스트
│   │   ├── surgery/                     # 수술 통계·수술자 리스트
│   │   ├── consultation/                # 전환율·예약률·중단사유
│   │   ├── outpatient/                  # 외래수
│   │   ├── overall/                     # 주간 종합지표
│   │   ├── report/                      # 주차 레포트 (ISO 주차 집계 API, 마트 경유 조회)
│   │   └── etc/                         # B2B 매출 · 드림렌즈 장부(entity+CRUD) 등 기타
│   ├── src/main/resources/
│   │   ├── application.yml                     # H2 인메모리 (개발 기본)
│   │   ├── application-postgres.yml            # PostgreSQL (운영)
│   │   ├── application-mssql.yml               # MSSQL 통계 운영 연동
│   │   └── sql/                                # 도메인별 .sql 리소스 (SqlLoader 로딩)
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # 진입점 (React 렌더)
│   │   ├── App.tsx                      # QueryClientProvider + RouterProvider
│   │   ├── router.tsx                   # TanStack Router (인증 가드 + statsPages 기반 자동 라우트)
│   │   ├── index.css                    # Tailwind 4 + OKLCH 테마 변수
│   │   ├── api/                         # 도메인별 API 폴더 (각 index.ts가 도메인 객체 export)
│   │   │   ├── client.ts               # HTTP 클라이언트 (Bearer 토큰 자동 주입) — 공용
│   │   │   ├── _shared.ts              # apiResponseOf() 등 공통 응답 래퍼 — 공용
│   │   │   ├── auth.ts                 # 로그인 API — 공용
│   │   │   ├── reservation/            # index.ts(reservationApi) + reservationList.ts
│   │   │   ├── exam/                   # index.ts(examApi) + examList.ts · cataractExamList.ts
│   │   │   ├── surgery/                # index.ts(surgeryApi) + surgeryList.ts
│   │   │   ├── consultation/           # index.ts(consultationApi)
│   │   │   ├── outpatient/             # index.ts(outpatientApi)
│   │   │   ├── overall/                # index.ts(overallApi)
│   │   │   ├── report/                 # index.ts(reportApi · 주차 레포트)
│   │   │   └── etc/                    # index.ts(b2bApi · B2B 매출)
│   │   ├── hooks/                       # 도메인별 TanStack Query 훅
│   │   │   ├── reservation/            # useReservationKpi/Trend/Composition/List/OverallTrend …
│   │   │   ├── exam/                   # useExamination*·useProcedureExamTrend·useExamList·useCataractExamList
│   │   │   ├── consultation/           # useConsultationRate*·useCataractReservationRateTrend·useStopReasonMonthly
│   │   │   ├── surgery/                # useSurgery*·useSurgeryRatio*
│   │   │   ├── overall/                # useOverallExamWeekly
│   │   │   ├── report/                 # useWeeklyReport
│   │   │   ├── outpatient/             # useOutpatientCountTrend
│   │   │   └── useIsMobile.ts          # (공용) 반응형 분기
│   │   ├── components/
│   │   │   ├── layout/                  # AppLayout·Sidebar·Topbar + desktop/·mobile/
│   │   │   ├── filters/                 # FilterBar·PeriodChip·Select
│   │   │   ├── stats/                   # KpiCard·StatsPrimitives (공용)
│   │   │   ├── report/                  # ReportLineChart·ReportWeekLineChart·reportWeeks(ISO 주차)
│   │   │   └── ui/                      # shadcn 컴포넌트 (button, card, chart)
│   │   ├── config/
│   │   │   ├── statsPages.ts            # 통계 페이지 정의 (id/path/section/apiDraftPath)
│   │   │   └── navigation.ts            # 메뉴 구조 + 구현 상태 맵
│   │   ├── pages/                       # 도메인별 폴더 (Login·Dashboard·StatsPlaceholder·pageRegistry만 root)
│   │   │   ├── pageRegistry.ts          # 도메인 routes.ts 통합 + PROD pending 라우트 차단 정책
│   │   │   ├── pageRegistry.test.ts     # 라우트 정책 불변식 테스트
│   │   │   ├── reservation/            # IntakeConversion·Reservation·ReservationOverall·ReservationList
│   │   │   ├── exam/                   # ExamList·CataractExamList·Examination(±Vision/Dreamlens)·ProcedureExam
│   │   │   ├── consultation/           # ConsultationRate(+consultation-rate/)·CataractReservationRate·StopReason
│   │   │   ├── surgery/                # SurgeryList·Surgery·SurgeryRatio(+surgery-ratio/)·SurgeryComposition
│   │   │   ├── report/                 # MonthlyReportPage(월간)·WeeklyReportPage(주차) + 공용 ReportShell·useReportSeries·reportItems
│   │   │   ├── overall/ · outpatient/ · marketing/ · cancel-noshow/ · unit-price/ · etc/
│   │   │   ├── LoginPage.tsx           # 로그인 (react-hook-form + Zod)
│   │   │   ├── DashboardPage.tsx       # 메인 대시보드 (KPI 카드 + 차트, 목업 데이터)
│   │   │   └── StatsPlaceholderPage.tsx # 미구현 통계 페이지 템플릿
│   │   ├── stores/                      # authStore (Zustand: token+user, localStorage 연동)
│   │   ├── constants/ · data/ · lib/ · utils/   # chart 상수·레거시 데이터·목 픽스처·cn()·stats 포맷터
│   │   └── test/                        # Vitest + @testing-library/jest-dom
│   ├── components.json                  # shadcn CLI 설정
│   ├── vite.config.ts                   # 프록시: /api → localhost:8080
│   └── package.json
│
├── 서버시작.bat                          # Backend(8080) + Frontend(5173) 동시 실행
├── 서버종료.bat                          # 포트 8080/5173 프로세스 종료
└── CLAUDE.md
```

### 도메인별 코드 구성 (백엔드=도메인 중심 / 프론트=레이어 우선)

도메인 = `statsPages.ts`의 메뉴 그룹(`sectionId`): `reservation`(예약) / `exam`(검사) / `surgery`(수술) / `consultation`(전환&성공률) / `report` / `overall`(전체지표) / `outpatient`(외래) / `marketing` / `cancel-noshow` / `unit-price` / `etc`.

- **백엔드(도메인 중심)**: `<domain>/{controller,service,repository,dto}` (예: `reservation/controller`, `reservation/service`). 인증은 `auth/`, 공통 응답·예외·유틸·통계 helper(`StatsPanelSupport`·`StatsRequestValidator`·`StatsResponseMeta`)는 `common/`(특히 `common/stats/`)에 둔다. `Mock*Repository`는 해당 도메인 `repository/`에 둔다.
- **프론트**: `api/<domain>/index.ts`(도메인 API 객체 + 타입) · `hooks/<domain>/` · `pages/<domain>/`. 리스트 전용 API는 `api/<domain>/xxxList.ts`에 둔다. 여러 도메인이 공유하는 것만 root(`api/_shared.ts`, `api/client.ts`, `api/auth.ts`, `hooks/useIsMobile.ts`, `pages/{Login,Dashboard,StatsPlaceholder}Page.tsx`, `pages/pageRegistry.ts`)에 둔다. 페이지 전용 하위 컴포넌트는 페이지 폴더 안에(`pages/consultation/consultation-rate/`, `pages/surgery/surgery-ratio/`).
- **신규 추가**: 새 통계 기능은 해당 도메인 폴더/패키지에 파일을 추가한다(새 레이어 루트에 흩뿌리지 말 것). 도메인이 없으면 메뉴 그룹 기준으로 새 폴더를 만든다.

> ✅ **이관 완료**: 백엔드는 **도메인 중심 패키지**(`<domain>/{controller,service,repository,dto}` + `auth`·`common`)로, 프론트(api·hooks·pages·pageRegistry)는 레이어 우선 + 도메인 하위 분할로 정리 완료. 공용 통계 유틸은 `common/stats/`. 검증 기준: frontend lint/build/test green, backend test green.

## 현재 구현 상태

### 구현 완료

- JWT 기반 로그인/인증 (백엔드 + 프론트)
- 메인 대시보드 레이아웃 (Sidebar + Topbar + Content)
- DashboardPage (KPI 카드 4개 + 차트 5개, 하드코딩 목업)
- ReservationPage (월별/연도별 비교, TanStack Query 기반 API 연동)
- 인증 라우트 가드 (미인증 시 /login 리다이렉트)
- 통계 전용 페이지 25종 + MSSQL(prod) 연동 통계 API (검사·수술·전환율·리스트·B2B 등, 아래 표 참조)
- 도메인별 `routes.ts` + `pageRegistry.ts` 기반 라우트 자동 생성
- PROD pending 메뉴 숨김 및 직접 URL placeholder 차단 정책

### 미구현 (플레이스홀더)

통계 페이지 13종은 아직 `pending` 상태. 개발(DEV)에서는 WIP 페이지 미리보기를 허용하고, 운영(PROD)에서는 사이드바에서 숨기며 직접 URL 접근도 `StatsPlaceholderPage`로 차단한다.

## 통계 페이지 목록

`statsPages.ts`에 38개 정의하고, `navigation.ts`의 상태 맵으로 완료/미구현을 관리한다. 상태: **완료**(전용 페이지+API) 25개 / **미구현(pending)** 13개.
(시력교정/드림렌즈 검사건수 2종은 `시술별`(examination)에 포함되어 2026-06-22 메뉴 삭제)

| ID | 메뉴명 | 경로 | 그룹 | 상태 |
|----|------|------|------|------|
| weekly-report | 주차 레포트 | /report/weekly | Report | 완료 (월간과 동일 도표를 ISO 주차축으로 · `/api/report/weekly` 운영 DB 라이브) |
| monthly-report | 월간 레포트 | /report/monthly | Report | 완료 |
| intake-conversion | 유입(검사예약) | /stats/intake-conversion | 예약 | 미구현 (메뉴 숨김) |
| reservation | 예약 건수 | /stats/reservation | 예약 | 완료 (메뉴 숨김·라우트 유지) |
| reservation-list | 예약자 리스트 | /stats/reservation-list | 예약 | 완료 (메뉴 순서: 예약 종합보다 앞) |
| reservation-overall | 예약 종합 | /stats/reservation-overall | 예약 | 완료 (3탭: 종합/온라인/콜, 지표정의 §5.1) |
| reservation-stats-system | 예약통계_시력교정 | /stats/reservation-stats-system | 예약 | 완료 (주차별 채널 분해, RSS 스냅샷+라이브) |
| reservation-stats-cataract | 예약통계_백내장 | /stats/reservation-stats-cataract | 예약 | 완료 (스냅샷 전용) |
| overall-exam | 월별 검사자 종합지표 | /stats/overall-exam | 검사 | 완료 (2026-07-07 전체지표→검사 이동) |
| overall-exam-weekly | 주간 검사자 종합지표 | /stats/overall-exam-weekly | 검사 | 완료 (2026-07-07 전체지표→검사 이동) |
| exam-list | 검사자 리스트 | /stats/exam-list | 검사 | 완료 |
| cataract-exam-list | 백내장 검사자 리스트 | /stats/cataract-exam-list | 검사 | 완료 |
| all-exam-list | 전체 검사자 리스트 | /stats/all-exam-list | 검사 | 완료 (시력교정+백내장 통합, 종합지표 정합) |
| examination | 시술별 | /stats/examination | 검사 | 완료 |
| procedure-exam | 검사건수 | /stats/procedure-exam | 검사 | 완료 |
| consultation-rate | 전환율 | /stats/consultation-rate | 전환&성공률 | 완료 |
| cataract-reservation-rate | 예약률 | /stats/cataract-reservation-rate | 전환&성공률 | 완료 |
| stop-rate | 중단률 | /stats/stop-rate | 전환&성공률 | 완료 (2026-07-07 신규, 중단수/시력교정 검사자) |
| stop-reason | 중단 사유 | /stats/stop-reason | 전환&성공률 | 완료 |
| surgery-list | 수술자 리스트 | /stats/surgery-list | 수술 | 완료 |
| surgery | 수술 건수 | /stats/surgery | 수술 | 완료 |
| surgery-ratio | 주요 수술별 비중 | /stats/surgery-ratio | 수술 | 완료 |
| surgery-composition | 수술별 비중 | /stats/surgery-composition | 수술 | 완료 (mart_surgery_daily 조회, 파일 스냅샷 폐지 · 주차=ISO 8601) |
| outpatient-list | 외래수 리스트 | /stats/outpatient-list | 외래 | 완료 (RESERVATION F + I/H, 외래수와 정합) |
| outpatient-count | 외래수 | /stats/outpatient-count | 외래 | 완료 |
| overseas | 해외 환자 관련 지표 | /stats/overseas | 마케팅 | 미구현 |
| marketing | 마케팅 유입 및 효율 지표 | /stats/marketing | 마케팅 | 미구현 |
| cancel-rate | 예약취소율 | /stats/cancel-rate | 취소&부도 | 미구현 |
| no-show-rate | 부도율 | /stats/no-show-rate | 취소&부도 | 미구현 |
| unit-price | 객단가 | /stats/unit-price | 객단가 | 미구현 |
| dreamlens-revenue | 드림렌즈 장부 | /stats/dreamlens-revenue | 기타 | 완료 (**직접 입력 테이블** · `dreamlens_ledger` JPA CRUD · `/api/dreamlens-ledger`) |
| b2b-revenue | B2B 매출 | /stats/b2b-revenue | 기타 | 완료 |
| staff-point | 직원 포인트 | /stats/staff-point | 기타 | 미구현 |
| prp-rate | PRP 시술율 | /stats/prp-rate | 기타 | 미구현 |
| reoperation-rate | 재수술율 | /stats/reoperation-rate | 기타 | 미구현 |
| same-day-op | 당일OP 비율 | /stats/same-day-op | 기타 | 미구현 |
| designated-doctor | 지정의 수술 비율 | /stats/designated-doctor | 기타 | 미구현 |
| visit-reason | 내원동기별 비중 | /stats/visit-reason | 기타 | 미구현 |
| daily-reception | 일일 접수/응대 건수 | /stats/daily-reception | 기타 | 미구현 |

> ⚠️ **메뉴명 주의**: `검사건수` 메뉴 = `procedure-exam`(전체 검사수 = EXAM 행 + Cataract_Exam 세션), `시술별` 메뉴 = `examination`(시력교정/드림렌즈/백내장 탭). id·경로와 라벨이 어긋나니 혼동 주의.

> 🙈 **메뉴 숨김(`navigation.ts`의 `HIDDEN_MENU_IDS`)**: 사이드바에서만 숨기고 페이지·라우트는 유지(직접 URL 접근 가능). 현재 숨김 — `intake-conversion`·`reservation`(예약), **마케팅·취소&부도·객단가 그룹 전체**(overseas·marketing·cancel-rate·no-show-rate·unit-price), 그리고 **기타 그룹 중 드림렌즈 매출을 뺀 전부**(b2b-revenue·staff-point·prp-rate·reoperation-rate·same-day-op·designated-doctor·visit-reason·daily-reception). 즉 `기타` 그룹은 **드림렌즈 매출 하나만 노출**된다. 자식이 모두 숨겨진 그룹은 menuItems에서 자동 제거. 재노출·재숨김은 `HIDDEN_MENU_IDS`에서 빼거나 넣으면 됨.

## 백엔드 컨벤션

### API 설계

```
POST   /api/auth/login                              # 로그인 (구현됨)

# 통계 API (도메인별 구현)
GET    /api/stats/{pageId}                           # 단일/요약 조회가 있는 메뉴
GET    /api/stats/{pageId}/monthly?years=2024,2025   # 월별 추이 계열
GET    /api/stats/{pageId}/kpi?years=2024,2025&mock=false
GET    /api/stats/{pageId}/trend?years=2024,2025&mock=false
GET    /api/stats/{pageId}/composition?years=2024,2025&mock=false
GET    /api/{listPageId}?from=2026-01-01&to=2026-01-31  # 리스트 계열
GET    /api/report/weekly?years=2024,2025,2026       # 주차 레포트 (ISO 8601 연간 주차 원시 집계)

# 직접 입력 장부 (조회 전용 통계와 달리 CRUD)
GET    /api/dreamlens-ledger?from=2026-07-01&to=2026-08-31
POST   /api/dreamlens-ledger                          # 행 추가
PUT    /api/dreamlens-ledger/{id}                     # 행 수정 (전체 필드 교체)
DELETE /api/dreamlens-ledger/{id}                     # 행 삭제
```

> ✍️ **예외 — 사용자가 직접 입력하는 원천 데이터**는 마트가 아니라 JPA 엔티티로 다룬다.
> 현재 `드림렌즈 장부`(`dreamlens_ledger`)가 유일하다. MSSQL 원천이 없고 화면에서 CRUD 하므로
> 배치·마트 대신 `etc/entity` + `JpaRepository` + `/api/dreamlens-ledger` 로 구성한다.
> 스키마는 `ddl-auto: update` 가 생성하고, 초기 10행은 `DreamlensLedgerSeeder` 가 표가 비었을 때만 넣는다.

> 🔌 **화면은 마트를 읽는다.** 통계 API 는 배치가 적재한 Postgres 마트를 조회하고, MSSQL 직결은
> 배치(적재) 시간대에만 쓴다. 그래서 SSH 터널·VPN 이 끊겨도 화면은 마지막 적재분으로 동작한다.
> 신규 통계 API 를 만들 때 `statsJdbcTemplate`(MSSQL) 로 화면을 직접 붙이지 말 것 —
> 마트 테이블 + `@Primary` 마트 QueryService + 배치 Job 을 함께 만든다(예: `report` 도메인).

> 📅 **주차 개념 3종 주의** — 이름이 비슷하지만 버킷 규칙이 다르다.
> - **ISO 연간 주차**(`utils/isoWeek.ts` · `WeeklyReportService`): 월~일, 첫 목요일이 든 주가 1주차, 한 해 52/53주. 주차 레포트·예약통계·수술별 비중 '주차' 탭이 쓴다.
> - **그 달의 주차**(`utils/weekBucket.ts` · `OverallExamWeeklyService`): 월 경계에서 잘라 각 달에 귀속 → 월 합계 = 그 달 주 합계. 주간 검사자 종합지표가 쓴다.
> - **월별**: 마트 확정값(2024·2025 레거시 시드 포함).

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
- Entity에 `@Setter` 금지 — 의미 있는 메서드로 상태 변경
- DTO <-> Entity: 정적 팩토리 (`XxxResponse.from(entity)`)
- 예외: `@RestControllerAdvice` + 커스텀 예외 클래스
- Validation: `@Valid` + Bean Validation (`@Email`, `@NotBlank` 등)
- 테스트 메서드명 한글 허용: `예약_건수_정상조회()`
- SQL 파라미터 바인딩 필수 (문자열 결합 절대 금지)
- Lombok: `@RequiredArgsConstructor`, `@Builder`, `@Getter` 허용 / `@Setter` 금지

### 신규 통계 API 추가 순서

> 도메인 = `<domain>` (reservation/exam/surgery/consultation/…). 모든 파일을 해당 도메인 패키지(`<domain>/{dto,repository,service,controller}`)에 둔다.

1. DTO 정의 (`<domain>/dto`)
2. Repository 작성 (`<domain>/repository`, 인라인 대신 `resources/sql/<domain>/`의 .sql 리소스 사용)
3. Service 비즈니스 로직 (`<domain>/service`)
4. Controller 엔드포인트 (`<domain>/controller`)
5. 프론트 API 함수(`api/<domain>/index.ts`, 필요 시 `api/<domain>/xxxList.ts`) + 훅(`hooks/<domain>/`) + 페이지(`pages/<domain>/`) 연결

## 프론트엔드 컨벤션

### 라우팅 패턴

- 인증 필요 페이지는 `authLayout` 하위에 등록 (`router.tsx`)
- 라우트는 `router.tsx`가 `statsPages.ts`의 `statsPages`와 `pages/pageRegistry.ts`의 `PAGE_COMPONENTS`를 합쳐 **자동 생성**한다. `pageRegistry.ts`는 각 도메인 레지스트리(`pages/<domain>/routes.ts`, `pageId → 컴포넌트`)를 통합한다.
- 레지스트리에 컴포넌트가 있고 운영 차단 대상이 아니면 전용 페이지, 없거나 PROD pending이면 `StatsPlaceholderPage`로 렌더한다(하드코딩 목록 없음).
- 새 통계 페이지 연결: `statsPages.ts`에 페이지 정의 → `navigation.ts` 상태 맵/메뉴 추가 → `pages/<domain>/`에 컴포넌트 작성 → `pages/<domain>/routes.ts`에 `'<id>': Component` 한 줄 추가 (**`router.tsx` 수정 불필요**)
- 훅은 `@/hooks/<domain>/useXxx`, API는 `@/api/<domain>`(리스트는 `@/api/<domain>/xxxList`)에서 import
- **pending(미완성) 메뉴 정책**: 운영 빌드(PROD)에서는 사이드바에서 **숨김** + 라우트 **차단**(직접 URL도 `StatsPlaceholderPage`). 개발 빌드에서는 미리보기 가능(사이드바 빨강 표시). 상태는 `MENU_STATUS`, 조회는 `getMenuStatus()`, 라우트 차단은 `pageRegistry.isRouteBlocked()`가 담당한다. `pageRegistry.test.ts`가 이 정책을 보호한다.

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
# 동시 실행
서버시작.bat                              # Backend(8080) + Frontend(5173)
서버종료.bat                              # 전체 종료

# 개별 실행
cd backend && gradlew.bat bootRun        # Backend (H2 인메모리 기본)
cd frontend && npm run dev               # Frontend (Vite dev server)

# PostgreSQL로 실행
cd backend && gradlew.bat bootRun --args='--spring.profiles.active=postgres'

# 빌드/테스트
cd frontend && npm run build             # 프로덕션 빌드
cd frontend && npm run lint              # ESLint
cd frontend && npm run test              # Vitest
```

## 공통 규칙

### Git

- 커밋: `feat: 예약 통계 페이지 구현`, `fix: 달성률 소수점 계산 오류`
- 브랜치: `dev` (개발, 기본), `main` (운영)
- **배포 플로우**: `dev` → PR → `main` (main에 직접 push 금지)
  1. `dev`에서 작업 및 커밋
  2. `git push origin dev`
  3. `gh pr create --base main` 로 PR 생성
  4. PR 머지 후 로컬 동기화 (`git pull origin main`)

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
- 프론트 환경변수: `VITE_` 접두사 사용
- Vite 프록시: `/api` → `http://localhost:8080` (`vite.config.ts`)

## Claude에게 요청할 때 참고사항

- **새 통계 페이지**: `statsPages.ts`에 정의 → `navigation.ts` 상태/메뉴 반영 → 전용 페이지 컴포넌트 작성 → `pages/<domain>/routes.ts`에 등록 → 백엔드 API 구현 (`router.tsx` 직접 수정 금지)
- **새 차트**: Recharts 기반, shadcn `ChartContainer` 사용, `CHART_PALETTE` 색상 적용
- **새 UI 컴포넌트**: `npx shadcn@latest add <name>` (설정: `components.json`)
- **API 연동**: `api/client.ts` HTTP 클라이언트 사용, TanStack Query `useQuery`로 캐싱
- **DashboardPage 데이터는 하드코딩 목업** — API 연동 시 교체 필요

## DB 테이블 카탈로그

`docs/db/tables/`에 35개 테이블의 컬럼 정보, PK/FK, JOIN 키, 함정(Gotchas)이 정리되어 있습니다.
이 DB는 EyeChartPro(Node.js, Java)와 공유하는 동일 MSSQL입니다.

### 참조 규칙

1. **SQL 쿼리 작성 전** 해당 테이블의 `docs/db/tables/{테이블명}.md`를 먼저 읽을 것
2. **"함정(Gotchas)" 섹션은 반드시 확인** — 과거 실수와 알려진 위험이 기록되어 있음
3. 원본은 softcrm 레포에 있으며, 갱신 시 동기화됨

### 고위험 테이블 (필독)

| 테이블 | 핵심 함정 |
|--------|----------|
| **CUSTOM** | JUMIN_NUM 복호화 비용 높음, 6개 직원필드 → EMPLOYEE.EMP_NUM |
| **RESERVATION** | SELECT_DOC vs RESERVE_DOC 우선순위, RESERVE_STATE 4상태(Y/I/H/C) |
| **EMPLOYEE** | EMP_STATE <> 'N' 퇴직자 필터 필수, EMP_NUM 형식 혼재 |
| **OPERATIONDATA** | OP_EMP 순서 역전(EMP2=C, EMP3=A), 고객당 1행 |
| **COSTPRICE** | 원데이 수술 합산 이슈, PrcItmLst JOIN 필요 |
