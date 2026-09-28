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
- **DB**: H2 (개발, 기본) / PostgreSQL 마트 (운영, `application-postgres-mart.yml`)
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
│   │   ├── reservation/                 # 예약·예약통계(시력교정/백내장)·변경이력(RESERVE_HISTORY 체인)·스냅샷·진단
│   │   ├── exam/                        # 검사 통계·검사자 리스트
│   │   ├── surgery/                     # 수술 통계·수술자 리스트
│   │   ├── consultation/                # 전환율·예약률·중단사유
│   │   ├── outpatient/                  # 외래수
│   │   ├── overall/                     # 주간 종합지표
│   │   ├── report/                      # 주차 레포트 (ISO 주차 집계 API, 마트 경유 조회)
│   │   ├── marketing/                   # 채널별 수익성(ChannelProfitController) · 해외마케팅(접수리스트 시트캐시+수기입력·CRM 매칭·통계·예약통계 — /api/overseas-marketing)
│   │   ├── sms/                         # 문자 발송 — 대상(target) 관리·홀딩·수기 발송·오프셋·수신동의(opt-out)·Solapi 웹훅 · MARKETING 부서(조회) + ADMIN(편집·[지금 실행]·[실패 재실행])
│   │   ├── accounting/                  # 회계 — 진료 수납(의사랑 IPLUS 링크드서버 OPENQUERY)·시력교정 매출(SOFTCRM 비급여 수납) 마트 조회 /api/accounting · 임원(ADMIN·DIRECTOR)
│   │   ├── etc/                         # B2B 매출 · 드림렌즈 장부(entity+CRUD) — init/ 하위에 초기 시더 배치
│   │   └── batch/                       # 배치 인프라 — job(*MartJob·*MartWriter) · admin(reconcile·admin/controller) · controller(BatchStatusController) · repository · dto
│   │
│   # 예약 퍼널·누적 안수는 도메인 소속(reservation/·surgery/)이 실제 데이터 출처와 맞고,
│   # 화면 사이드바에서만 마케팅 섹션에 노출된다 (marketing-section).
│   #   reservation/controller/ReservationChannelController      → /api/stats/reservation-channel · v_reservation_channel 뷰
│   #   surgery/controller/AccumulatedEyeController              → /api/accumulated-eyes (OPERATION_ACCUMULATED_EYE_COUNT 원천 마트 적재)
│   ├── src/main/resources/
│   │   ├── application.yml                     # 공통 + 프로파일 그룹 ({local|dev|prod} → postgres-mart 포함)
│   │   ├── application-local.yml               # 로컬 개발 (H2 인메모리, 배치 비활성)
│   │   ├── application-dev.yml                 # 개발 서버 (Postgres 마트 + MSSQL 배치)
│   │   ├── application-prod.yml                # 운영 (Postgres 마트 + MSSQL 배치 + Slack 알림)
│   │   ├── application-postgres-mart.yml       # 마트 인프라 (batch DataSource·스케줄러) — 위 셋에 group include
│   │   └── sql/                                # 도메인별 .sql 리소스 (SqlLoader 로딩)
│   └── build.gradle
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # 진입점 (React 렌더)
│   │   ├── App.tsx                      # QueryClientProvider + createRouter(routeTree) + RouterProvider
│   │   ├── routeTree.gen.ts             # @tanstack/router-plugin 이 src/routes 로부터 생성 (커밋 대상 · 직접 수정 금지)
│   │   ├── routes/                      # TanStack 파일 기반 라우트 — 페이지 입구 + staticData.page(메타·권한)
│   │   │   ├── __root.tsx · login.tsx   # 루트(NotFound) · 로그인
│   │   │   ├── -internal/               # 라우트 아닌 파일(`-` 접두사) — NotFound · routeTree.test
│   │   │   └── _auth/                   # 경로 없는 인증 레이아웃 — route.tsx(beforeLoad: 인증 + 접근 판정) · index.tsx(대시보드)
│   │   │       ├── -internal/           # requireAuth · RouteGate(차단 화면 분기) · Forbidden
│   │   │       ├── stats/(<domain>)/    # 통계 페이지 — (그룹)은 URL 에 안 붙는 폴더 묶음 (예: stats/(exam)/exam-list.tsx → /stats/exam-list)
│   │   │       └── report/ · accounting/ · admin/
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
│   │   │   ├── marketing/              # channelProfit.ts · accumulatedEyes.ts · overseasMarketing.ts(해외마케팅 접수리스트·통계·예약통계)
│   │   │   ├── sms/                    # index.ts — 대상·오프셋·홀딩·발송·Solapi 템플릿·수신동의
│   │   │   ├── admin/                  # users.ts (계정 CRUD /api/admin/users) · batchAdmin.ts (수동 실행·재실행)
│   │   │   ├── batch/                  # index.ts (배치 상태·이력 조회)
│   │   │   └── etc/                    # index.ts(b2bApi · B2B 매출)
│   │   ├── hooks/                       # 도메인별 TanStack Query 훅
│   │   │   ├── reservation/            # useReservationKpi/Trend/Composition/List/OverallTrend …
│   │   │   ├── exam/                   # useExamination*·useProcedureExamTrend·useExamList·useCataractExamList
│   │   │   ├── consultation/           # useConsultationRate*·useCataractReservationRateTrend·useStopReasonMonthly
│   │   │   ├── surgery/                # useSurgery*·useSurgeryRatio*
│   │   │   ├── overall/                # useOverallExamWeekly
│   │   │   ├── report/                 # useWeeklyReport
│   │   │   ├── marketing/              # useChannelProfit·useAccumulatedEyes*·useOverseasMarketing(접수/통계/예약통계 + 동기화·매칭 mutation)·useReservationChannel(퍼널·op-types)
│   │   │   ├── sms/                    # useSms* (targets·offsets·send·failed-retry·opt-out·templates)
│   │   │   ├── admin/                  # useUsers*·useBatchAdmin (계정 CRUD·수동 실행)
│   │   │   ├── batch/                  # useBatchStatus (상태·이력)
│   │   │   ├── outpatient/             # useOutpatientCountTrend
│   │   │   └── useIsMobile.ts          # (공용) 반응형 분기
│   │   ├── components/
│   │   │   ├── layout/                  # AppLayout·Sidebar·Topbar + desktop/·mobile/
│   │   │   ├── filters/                 # FilterBar·PeriodChip·Select
│   │   │   ├── stats/                   # KpiCard·StatsPrimitives (공용)
│   │   │   ├── report/                  # ReportLineChart·ReportWeekLineChart·reportWeeks(ISO 주차)
│   │   │   └── ui/                      # shadcn 컴포넌트 (button, card, chart)
│   │   ├── config/
│   │   │   ├── pageAccess.ts            # PageMeta 타입(staticData.page) · canAccess(접근 판정 — 라우트·사이드바 공용)
│   │   │   └── navigation.ts            # MENU_TREE(메뉴 구조·순서, 페이지는 타입 있는 경로) · HIDDEN_PAGE_PATHS · buildMenu
│   │   ├── pages/                       # 페이지 컴포넌트 (라우트 파일이 import) · 도메인별 폴더 (Login·Dashboard·StatsPlaceholder만 root)
│   │   │   ├── reservation/            # Reservation·ReservationOverall·ReservationList·ReservationChange(+reservation-change/)
│   │   │   ├── exam/                   # ExamList·CataractExamList·Examination(±Vision/Dreamlens)·ProcedureExam
│   │   │   ├── consultation/           # ConsultationRate(+consultation-rate/)·CataractReservationRate·StopReason
│   │   │   ├── surgery/                # SurgeryList·Surgery·SurgeryRatio(+surgery-ratio/)·SurgeryComposition
│   │   │   ├── report/                 # MonthlyReportPage(월간)·WeeklyReportPage(주차) + 공용 ReportShell·useReportSeries·reportItems
│   │   │   ├── reservation/            # …·ReservationChannelPage(예약 퍼널 — 사이드바는 마케팅 섹션)
│   │   │   ├── marketing/              # ChannelProfit·ChannelAnalysis(+channel-analysis/ 채널별 정적 문서)·AccumulatedEyes·Overseas* 3종
│   │   │   ├── sms/                    # SmsManagementPage + 하위 컴포넌트(오프셋 그리드·발송 대기열·실패 재실행 모달·수신동의·Solapi 템플릿 등)
│   │   │   ├── admin/                  # BatchManagementPage·AccountManagementPage(+UserFormDialog·DeleteConfirmDialog)
│   │   │   ├── overall/ · outpatient/ · accounting/ · cancel-noshow/ · unit-price/ · etc/
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
├── docker-compose.local.yml              # 로컬 개발용 Compose (기본 사용)
├── Dockerfile.local                      # 로컬 개발용 이미지 (Infisical 미사용)
├── docker-compose.yml                    # 운영/Jenkins용 Compose
├── Dockerfile                            # 운영/Jenkins용 이미지
└── CLAUDE.md
```

### 도메인별 코드 구성 (백엔드=도메인 중심 / 프론트=레이어 우선)

도메인 = 사이드바 메뉴 그룹(`navigation.ts` `MENU_TREE` 의 섹션·그룹 id): `reservation-group`(예약) / `exam-group`(검사) / `surgery`·`surgery-ratio`(수술) / `consultation`(전환&성공률) / `report-group` / `outpatient`(외래) / `marketing-section`(마케팅 — 채널·SMS·누적안수) / `overseas-marketing-section`(해외마케팅) / `accounting-section`(회계) / `admin`(관리자) / `marketing`·`cancel-noshow`·`unit-price`·`etc`(미구현/개별 잎).

> 🧭 **화면 섹션과 백엔드 도메인은 항상 같지 않다.** 예약 퍼널(`reservation-channel`)은 백엔드에서 `reservation/` 도메인(마트 뷰 `v_reservation_channel`)에 있지만 사이드바는 마케팅 섹션에 노출한다. 누적 안수(`accumulated-eyes`)도 `surgery/` 도메인이지만 마케팅 섹션이다. 판단 기준: **데이터 출처가 있는 곳**에 백엔드 코드를 두고 사이드바만 옮긴다.

- **백엔드(도메인 중심)**: `<domain>/{controller,service,repository,dto}` (예: `reservation/controller`, `reservation/service`). 인증은 `auth/`, 공통 응답·예외·유틸·통계 helper(`StatsPanelSupport`·`StatsRequestValidator`·`StatsResponseMeta`)는 `common/`(특히 `common/stats/`)에 둔다. `Mock*Repository`는 해당 도메인 `repository/`에 둔다.
- **프론트**: `api/<domain>/index.ts`(도메인 API 객체 + 타입) · `hooks/<domain>/` · `pages/<domain>/`. 리스트 전용 API는 `api/<domain>/xxxList.ts`에 둔다. 여러 도메인이 공유하는 것만 root(`api/_shared.ts`, `api/client.ts`, `api/auth.ts`, `hooks/useIsMobile.ts`, `pages/{Login,Dashboard,StatsPlaceholder}Page.tsx`)에 둔다. 페이지 전용 하위 컴포넌트는 페이지 폴더 안에(`pages/consultation/consultation-rate/`, `pages/surgery/surgery-ratio/`).
- **신규 추가**: 새 통계 기능은 해당 도메인 폴더/패키지에 파일을 추가한다(새 레이어 루트에 흩뿌리지 말 것). 도메인이 없으면 메뉴 그룹 기준으로 새 폴더를 만든다.

> ✅ **이관 완료**: 백엔드는 **도메인 중심 패키지**(`<domain>/{controller,service,repository,dto}` + `auth`·`common`)로, 프론트(api·hooks·pages)는 레이어 우선 + 도메인 하위 분할로 정리 완료. 공용 통계 유틸은 `common/stats/`. 검증 기준: frontend lint/build/test green, backend test green.

## 현재 구현 상태

### 구현 완료

- JWT 기반 로그인/인증 (백엔드 + 프론트)
- 메인 대시보드 레이아웃 (Sidebar + Topbar + Content)
- DashboardPage (KPI 카드 4개 + 차트 5개, 하드코딩 목업)
- ReservationPage (월별/연도별 비교, TanStack Query 기반 API 연동)
- 인증 라우트 가드 (미인증 시 /login 리다이렉트)
- 통계 전용 페이지 44종(+ 미완성 목업 4종) + MSSQL(prod) 연동 통계 API (검사·수술·전환율·리스트·B2B 등, 아래 표 참조)
- TanStack 파일 기반 라우트(`src/routes`, 2026-09-28 전환) + 페이지 메타·권한은 라우트 `staticData.page` 에 선언
- PROD pending 메뉴 숨김 및 직접 URL placeholder 차단 정책 · 권한 없는 페이지는 "접근 권한이 없습니다" 화면
- 회계 5종 (진료 수납·시력교정 매출 내역·매출 집계·매출 그래프 2종 — 2026-09-15 마트 `list_medical_receipt`·`mart_medical_receipt_monthly`·`list_vision_receipt` + `/api/accounting` 연동 · 배치 도메인 `ACCOUNTING` · 임원(ADMIN·DIRECTOR) 이상 · 2026-09-17)
- 회계 정합성: 진료 행·집계는 월 전체를 함께 교체하고 `rows_complete`로 월별 조회 경로를 선택한다. 회계만 매월 2023년부터 과거 이력을 재검산하며, 진료 부분 실패는 성공 데이터 보존 + FAILED 이력으로 처리한다 (`docs/accounting/mart-and-api.md`).
- 해외마케팅 3종 (접수리스트·통계·예약통계 — 2026-09-09 `2026-08-14` 브랜치에서 이관 · Google Sheet 1회 이관 캐시 + 수기 입력 · CRM 매칭 · `/api/overseas-marketing` · OVERSEAS_MARKETING 부서 전용 · 2026-09-17 MARKETING 배제)
- 마케팅 4종 (예약 퍼널·채널별 수익성·채널별 분석·누적 안수 + 문자 발송 리스트 — MARKETING 부서 전용) · 예약 퍼널은 마트 뷰 `v_reservation_channel`(사람 수 기준) · 채널별 분석은 조회 없는 정적 문서 · 누적 안수는 MSSQL 원천 마트 적재 · SMS 는 § 5-2 완화 이후 STAFF 개방, 편집·[지금 실행]·[실패 재실행]은 ADMIN 만
- 계정 관리 (`/admin/accounts` · ADMIN 롤 전용 · 2026-09-16) — `POST/PUT/DELETE /api/admin/users` · BCrypt · 자기 자신 롤·부서 변경/삭제 400 · 마지막 ADMIN 삭제 400 · 롤×부서 조합은 화면(Zod)과 DB CHECK(`users_role_department_scope_ck`)가 동시에 검증

### 미구현 (플레이스홀더)

통계 페이지 4종(마케팅 효율·예약취소율·부도율·객단가)은 아직 `pending` 상태(목업 UI만 있음). 개발(DEV)에서는 WIP 페이지 미리보기를 허용하고, 운영(PROD)에서는 사이드바에서 숨기며 직접 URL 접근도 `StatsPlaceholderPage`로 차단한다.

## 통계 페이지 목록

라우트 파일 48개(각 `staticData.page.status`)로 완료/미구현을 관리한다. 상태: **완료**(전용 페이지+API 또는 정적 문서) 44개 / **미구현(pending)** 4개.
(라우트 없이 정의만 있던 기타 그룹 미구현 7종 — 직원 포인트·PRP 시술율·재수술율·당일OP 비율·지정의 수술 비율·내원동기별 비중·일일 접수/응대 건수 — 은 2026-09-28 파일 라우트 전환 때 삭제. 구현할 때 라우트 파일과 함께 다시 만든다.)
(시력교정/드림렌즈 검사건수 2종은 `시술별`(examination)에 포함되어 2026-06-22 메뉴 삭제)

| ID | 메뉴명 | 경로 | 그룹 | 상태 |
|----|------|------|------|------|
| weekly-report | 주차 레포트 | /report/weekly | Report | 완료 (월간과 동일 도표를 ISO 주차축으로 · `mart_weekly_report` 조회, 2025 골든시드 · 2026+ 는 배치가 채널 마트에서 접기) |
| monthly-report | 월간 레포트 | /report/monthly | Report | 완료 |
| reservation | 예약 건수 | /stats/reservation | 예약 | 완료 (메뉴 숨김·라우트 유지) |
| reservation-list | 예약자 리스트 | /stats/reservation-list | 예약 | 완료 (메뉴 순서: 예약 종합보다 앞) |
| reservation-list-homepage | 예약자 리스트_홈페이지 | /stats/reservation-list-homepage | 예약 | 완료 (레거시 홈페이지 소스 · `HOMEPAGE_DATASOURCE_URL` 미설정 시 503) |
| reservation-overall | 예약 종합 | /stats/reservation-overall | 예약 | 완료 (3탭: 종합/온라인/콜, 지표정의 §5.1) |
| reservation-stats-system | 예약통계_시력교정 | /stats/reservation-stats-system | 예약 | 완료 (주차별 채널 분해, RSS 스냅샷+라이브) |
| reservation-stats-cataract | 예약통계_백내장 | /stats/reservation-stats-cataract | 예약 | 완료 (스냅샷 전용) |
| reservation-change | 예약 변경이력 | /stats/reservation-change | 예약 | 완료 (2026-09-08 신규 · RESERVE_HISTORY 체인 → `list_reservation_change` 마트(배치 도메인 `RESERVATION_CHANGE`, 범위 = 이력 저장 기간) · 변경 상세 탭 + 추이 달력 탭(일별 등록·변경·변경률, 등록일/예약일 기준)) |
| overall-exam | 월별 검사자 종합지표 | /stats/overall-exam | 검사 | 완료 (**관리자 전용** · 2026-07-07 전체지표→검사 이동) |
| overall-exam-weekly | 주간 검사자 종합지표 | /stats/overall-exam-weekly | 검사 | 완료 (**관리자 전용** · 2026-07-07 전체지표→검사 이동) |
| exam-list | 검사자 리스트 | /stats/exam-list | 검사 | 완료 (**관리자 전용**) |
| cataract-exam-list | 백내장 검사자 리스트 | /stats/cataract-exam-list | 검사 | 완료 (**관리자 전용**) |
| all-exam-list | 전체 검사자 리스트 | /stats/all-exam-list | 검사 | 완료 (시력교정+백내장 통합, 종합지표 정합) |
| eoeis-checkup | 아이리더 검사통계 | /stats/eoeis-checkup | 검사 | 완료 (**관리자 전용** · 2026-08-05 신규 · 검사자×장비/기간 피벗 · `EOEIS_DATASOURCE_URL` 미설정 시 503) |
| examination | 시술별 | /stats/examination | 검사 | 완료 |
| procedure-exam | 검사건수 | /stats/procedure-exam | 검사 | 완료 |
| consultation-rate | 전환율 | /stats/consultation-rate | 전환&성공률 | 완료 (**관리자 전용**) |
| cataract-reservation-rate | 예약률 | /stats/cataract-reservation-rate | 전환&성공률 | 완료 |
| stop-rate | 중단률 | /stats/stop-rate | 전환&성공률 | 완료 (2026-07-07 신규, 중단수/시력교정 검사자) |
| stop-reason | 중단 사유 | /stats/stop-reason | 전환&성공률 | 완료 |
| surgery-list | 수술자 리스트 | /stats/surgery-list | 수술 | 완료 |
| surgery | 수술 건수 | /stats/surgery | 수술 | 완료 (**관리자 전용**) |
| surgery-ratio | 주요 수술별 비중 | /stats/surgery-ratio | 수술 | 완료 |
| surgery-composition | 수술별 비중 | /stats/surgery-composition | 수술 | 완료 (mart_surgery_daily 조회, 파일 스냅샷 폐지 · 주차=ISO 8601) |
| outpatient-list | 외래수 리스트 | /stats/outpatient-list | 외래 | 완료 (RESERVATION F + I/H, 외래수와 정합) |
| outpatient-count | 외래수 | /stats/outpatient-count | 외래 | 완료 |
| reservation-channel | 예약 퍼널 | /stats/reservation-channel | 마케팅 | 완료 (2026-08-06 예약→마케팅 이동 · 마트 뷰 `v_reservation_channel` · 사람 수 기준 8단계 퍼널 + 수술대기·재수술·객단가 · **MARKETING 부서 전용** · 백엔드는 `reservation/` 도메인) |
| channel-profit | 채널별 수익성 | /stats/channel-profit | 마케팅 | 완료 (2026-08-07 신규 · 탭2: 유입채널 수익성/광고매체 효율 · 광고비·렌즈단가는 화면 입력 · **MARKETING 부서 전용**) |
| channel-analysis | 채널별 분석 | /stats/channel-analysis | 마케팅 | 완료 (2026-09 신규 · **조회 없음 · 정적 문서 10편** · 채널마다 "누가 오는가 · 객단가가 왜 그런가 · 검증/죽은 가설 · 실측 기간" · 일부 채널만 추세 차트에서 라이브 조회 · MARKETING 부서 전용) |
| accumulated-eyes | 누적 안수 | /stats/accumulated-eyes | 마케팅 | 완료 (MSSQL `OPERATION_ACCUMULATED_EYE_COUNT` 원천 마트 적재 · 기간 리스트 + 이름·차트·전화·안수 검색 · **MARKETING 부서 전용** · 백엔드는 `surgery/` 도메인) |
| sms | 문자 발송 리스트 | /stats/sms | 마케팅 | 완료 (수술 후 안내 1~3차 알림톡·SMS 대상 관리·홀딩·수기 발송 · Solapi 웹훅으로 결과 반영 · **MARKETING 부서 전용** · § SMS 5-2 완화 이후 STAFF 개방 · 편집·[지금 실행]·[실패 재실행]은 ADMIN 만 · `/api/sms-management/**` + `/api/admin/batch/sms/queue/**`) |
| overseas-marketing-receptions | 접수리스트 | /stats/overseas-marketing/receptions | 해외마케팅 | 완료 (2026-09-09 `2026-08-14` 브랜치에서 이관 · Google Sheet 1회 이관 캐시 `overseas_marketing_sheet` + 수기 입력 · CRM 매칭 3단계(접수/매칭/확인필요) · **OVERSEAS_MARKETING 부서 전용** (2026-09-17 MARKETING 배제)) |
| overseas-marketing-statistics | 통계 | /stats/overseas-marketing/statistics | 해외마케팅 | 완료 (유입→검사·수술 월별 흐름 · 국가별 수술 · 검사·수술·외래·렌즈 매출 · OVERSEAS_MARKETING 부서 전용 · 2026-09-17 MARKETING 배제) |
| overseas-reservation-stats | 예약통계 | /stats/overseas-marketing/reservation-stats | 해외마케팅 | 완료 (국가그룹·채널별 문의/예약/검사/수술/외래 · ~2026-08-23 레거시 시드 `overseas_reservation_stats` · 이후 접수리스트 자동 집계 · 일간 셀 수정 · OVERSEAS_MARKETING 부서 전용 · 2026-09-17 MARKETING 배제) |
| marketing | 마케팅 유입 및 효율 지표 | /stats/marketing | 마케팅 | 미구현 |
| cancel-rate | 예약취소율 | /stats/cancel-rate | 취소&부도 | 미구현 |
| no-show-rate | 부도율 | /stats/no-show-rate | 취소&부도 | 미구현 |
| unit-price | 객단가 | /stats/unit-price | 객단가 | 미구현 |
| accounting-medical | 진료 수납 | /accounting/medical-receipts | 회계 | 완료 (**임원 이상** · 2026-09-15 · 의사랑 `PAOSUNAB_New`/`PAISUNAB_New` 원장 → `list_medical_receipt` 2026~ · 링크드서버 OPENQUERY) |
| accounting-vision | 시력교정 매출 내역 | /accounting/vision-revenue | 회계 | 완료 (**임원 이상** · SOFTCRM `CstPrcSub`+`PrcItmDtl` → `list_vision_receipt` 2023~ · 취소행 음수 상계) |
| accounting-vision-summary | 시력교정 매출 집계 | /accounting/vision-revenue-summary | 회계 | 완료 (**임원 이상** · 한울회계법인 피벗(매입사×진료명) · `list_vision_receipt` 를 화면에서 접음) |
| accounting-vision-chart | 시력교정 매출 그래프 | /accounting/vision-revenue-chart | 회계 | 완료 (**임원 이상** · `list_vision_receipt` 월별 GROUP BY) |
| accounting-medical-chart | 진료 매출 그래프 | /accounting/medical-revenue-chart | 회계 | 완료 (**임원 이상** · 행 연도(2026~)는 `list_medical_receipt` 재집계+구분 필터 · 그 전은 `mart_medical_receipt_monthly` 레거시 순액) |
| dreamlens-revenue | 드림렌즈 장부 | /stats/dreamlens-revenue | 기타 | 완료 (**직접 입력 테이블** · `dreamlens_ledger` JPA CRUD · `/api/dreamlens-ledger`) |
| b2b-revenue | B2B 매출 | /stats/b2b-revenue | 기타 | 완료 |
| batch-management | 데이터 배치 관리 | /admin/batch | 관리자 | 완료 (**ADMIN 전용** · 마트 재적재/실행 이력) |
| account-management | 계정 관리 | /admin/accounts | 관리자 | 완료 (**ADMIN 전용** · 2026-09-16 신규 · `/api/admin/users` CRUD · 롤×부서 조합은 화면 Zod + DB CHECK 이중 검증 · 자기 자신 롤·부서 변경/삭제 400 · 마지막 ADMIN 삭제 400 · BCrypt) |
| guide | 가이드 | /guide/prd.html | 관리자 | 완료 (**ADMIN 전용** · `external=true` 새 탭 · `frontend/public/guide/` 정적 사이트 · 대시보드 기획서 · 라우트 아님, `navigation.ts` `MENU_TREE` 의 링크 항목) |
| api-docs | API 문서 | /docs/ | 관리자 | 완료 (**ADMIN 전용** · Swagger UI 새 탭 · backend static `/docs/index.html` · Vite dev 는 `vite.config.ts` `/docs` 프록시) |

> ⚠️ **메뉴명 주의**: `검사건수` 메뉴 = `procedure-exam`(전체 검사수 = EXAM 행 + Cataract_Exam 세션), `시술별` 메뉴 = `examination`(시력교정/드림렌즈/백내장 탭). id·경로와 라벨이 어긋나니 혼동 주의.

> 🙈 **메뉴 숨김**: 메뉴는 `navigation.ts` 의 `MENU_TREE` 에 적힌 페이지만 보인다. 라우트는 있지만 메뉴에서 뺀 페이지는 `HIDDEN_PAGE_PATHS` 에 명시한다(직접 URL 접근은 가능 · 권한·pending 차단은 그대로). 현재 숨김 — `/stats/reservation`(예약 건수), `/stats/marketing`·`/stats/cancel-rate`·`/stats/no-show-rate`·`/stats/unit-price`(pending), `/stats/b2b-revenue`. 즉 `기타` 그룹은 **드림렌즈 장부 하나만 노출**된다. 재노출은 `HIDDEN_PAGE_PATHS` 에서 빼고 `MENU_TREE` 에 넣으면 됨. 메뉴에도 숨김 목록에도 없는 페이지 라우트는 `navigation.test.ts` 가 막는다.

> 📖 **관리자 > 가이드 (`/guide/prd.html`)** — 사이드바 "가이드"를 누르면 새 탭에서 열리는 **대시보드 기획서 정적 사이트**. 정본은 `backend/new_대쉬보드_v4/`, 배포용 복사본은 `frontend/public/guide/` (Vite 가 `/guide/**` 로 그대로 서빙). 구성:
>
> | 경로 | 내용 |
> |---|---|
> | `prd.html` | 입구. 대시보드 요구사항 · **전메뉴 현황** 55종 (구현 상태·데이터 경로·로드맵) · 지표 정의 · IA · 화면 조회 쿼리문 · 26.09 목표 · 26.10 이후 확장 전략 |
> | `pages/<id>.html` | 메뉴별 기획서 54장 (완료 43 · 미작성 12). 1·6·7·8·9장(개요·데이터 소스·API·권한·연관 문서)은 `_build/scan.mjs → gen.mjs` 자동 생성, 2·3·4·5·10장은 `_build/content/<id>.mjs` 사람 본문 |
> | `sms.html` | 문자 발송 관리 기획서 (메뉴별 기획서의 본보기) |
> | `glossary.html` | 용어사전 149개 (수술명·검사·지표·수납 · ⚠ 함정 표시 · 파일 상단 `TERMS` 배열만 고치면 됨) |
> | `지표정의/*.html` | 환자 흐름별 지표 정의 6문서 (예약 → 검사 → 전환율 → 수술 → 외래 → 예약률) — 레포 `docs/` 복사본 |
> | `db/`, `점검/`, `databatch/` | DB 카탈로그·레거시 대조·배치 전략 (레포 `docs/` 복사본) |
>
> ⚙️ **재생성**: 메뉴가 늘거나 API 가 바뀌면 손으로 고치지 말 것. `cd backend/new_대쉬보드_v4/_build && node scan.mjs && node gen.mjs`(그리고 지표는 `node render-metric-docs.mjs`) 로 만들고, 그 결과를 `frontend/public/guide/` 로 복사해 배포한다. `gen.mjs` 는 `prd.html` 의 `<!-- GEN:menu-status --> … <!-- /GEN:menu-status -->` 마커 사이만 갈아끼우므로 손으로 쓴 본문(PRD 도입부 등)은 살아남는다. 레포 경로는 `_build/config.json` (또는 env `DASHBOARD_REPO`).
>
> ⚠️ `frontend/public/guide/` 와 `backend/new_대쉬보드_v4/` 는 **원본-복사본 관계**. 정본은 v4 쪽이고 배포 시점에 public/ 로 밀어 넣는다. 한쪽만 수정하면 갈라진다 — 편집은 항상 v4 에서.

> 🔐 **권한 2축 (롤 × 부서)** — 정본은 `docs/auth/permissions.md`. 계정 관리 화면(`/admin/accounts`) 이 유일한 입구이며, 화면(Zod)과 DB CHECK(`users_role_department_scope_ck`) 가 동시 검증한다.
>
> | 롤 \ 부서 | ALL | MEDICAL | MARKETING | OVERSEAS_MARKETING |
> |---|---|---|---|---|
> | **ADMIN** | ✅ 전권 (개발자) | 🚫 | 🚫 | 🚫 |
> | **DIRECTOR** | ✅ 임원 열람 (조작 X) | 🚫 | 🚫 | 🚫 |
> | **MANAGER** | 🚫 | ✅ 실장·본부장 | ✅ 마케팅 팀장 | ✅ 해외마케팅 팀장 |
> | **STAFF** | 🚫 | ✅ 상담·간호·원장 | ✅ 마케팅 실무 | ✅ 해외마케팅 실무 |
>
> 게이팅 지점: 각 라우트 `staticData.page.access` (`{ role: 'ADMIN' }` · `{ role: 'EXECUTIVE' }` · `{ department }` 중 하나) → `config/pageAccess.ts` `canAccess` 하나로 판정. 라우트 차단(`routes/_auth/route.tsx` beforeLoad)과 사이드바(`navigation.ts` `buildMenu`)가 같은 함수를 쓴다. 백엔드는 `SecurityConfig` 매처가 대칭 유지 — 예: `/api/accounting/**` = `hasAnyRole("ADMIN","DIRECTOR")`, `/api/admin/**` = `hasRole("ADMIN")`, `/api/overseas-marketing/**` 은 OVERSEAS_MARKETING 부서.

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

# 회계 (마트 조회 · 임원 ADMIN·DIRECTOR · 범위 최대 366일)
GET    /api/accounting/medical-receipts?from&to                 # 진료 수납 내역 (의사랑 · list_medical_receipt 2026~)
GET    /api/accounting/medical-receipts/monthly?years=&category=전체|외래|입원|백내장   # 행 연도는 재집계, 그 전은 월집계('전체'만)
GET    /api/accounting/vision-receipts?from&to                  # 시력교정 매출 내역 (집계 화면도 이 행을 접는다)
GET    /api/accounting/vision-receipts/monthly?years=
GET    /api/accounting/status                                   # 적재 현황 (데이터 기준일 · 기간)

# 직접 입력 장부 (조회 전용 통계와 달리 CRUD)
GET    /api/dreamlens-ledger?from=2026-07-01&to=2026-08-31
POST   /api/dreamlens-ledger                          # 행 추가
PUT    /api/dreamlens-ledger/{id}                     # 행 수정 (전체 필드 교체)
DELETE /api/dreamlens-ledger/{id}                     # 행 삭제

# 해외마케팅 (마트 overseas_marketing_sheet 조회 + 수기 CRUD · CRM(MSSQL) 은 동기화 시에만 직결 · OVERSEAS_MARKETING 부서 전용 · 2026-09-17 MARKETING 배제)
GET    /api/overseas-marketing/receptions?from=&to=&dateType=inquiry_date&dateEnabled=true&status=&source=all&unmatched=false
POST   /api/overseas-marketing/receptions                  # 수기 행 추가 (origin='manual')
PUT    /api/overseas-marketing/receptions/{rowNumber}      # 시트 원본 컬럼 수정
DELETE /api/overseas-marketing/receptions/{rowNumber}      # 삭제 (동기화가 지나간 행은 409 RowLocked)
PUT    /api/overseas-marketing/receptions/{rowNumber}/match  # 수동 CRM 매칭 {customerNo}
GET    /api/overseas-marketing/crm-customers/{customerNo}  # 매칭 팝업 검증
POST   /api/overseas-marketing/sync-crm  · GET /sync-crm/status      # CRM 재매칭 (백그라운드 잡)
POST   /api/overseas-marketing/sync-sheet · GET /sync-availability   # Google Sheet 전체 동기화 (OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED)
GET    /api/overseas-marketing/statistics?year=2026&granularity=month
GET    /api/overseas-marketing/reservation-stats?year=2026&granularity=month|week|day
PUT    /api/overseas-marketing/reservation-stats/{date}    # 일간 셀 수정 {groupKey, metricKey, value}

# 예약 퍼널·누적 안수 (마케팅 섹션 · MARKETING 부서 전용)
GET    /api/stats/reservation-channel?from=2026-07&to=2026-07           # 8단계 퍼널 · 사람 수(DISTINCT) · v_reservation_channel
GET    /api/stats/reservation-channel/op-types?from&to&channel=          # 수술완료 클릭 시 유형별 인원 (smilePro·smile·lasek·icl·lasik·...)
GET    /api/accumulated-eyes?from=&to=&keyword=&keywordType=name|chart|phone|eye_count

# 문자 발송 (MARKETING 부서 조회 · ADMIN 편집/발송/실패 재실행)
GET    /api/sms-management/targets    · POST /targets    · POST /targets/import   # 대상 조회·수기 추가·CRM 재동기화(임포트)
GET    /api/sms-management/lookup     · GET  /offsets    · PUT  /offsets           # 대상 조회 도우미·오프셋(D+N) · PUT=ADMIN
GET    /api/sms-management/opt-outs   · POST /opt-outs                             # 수신동의 조회·해지
POST   /api/sms-management/send                                                     # 수기 발송 (ADMIN)
POST   /api/sms-management/sync                                                     # CRM 대상 재적재 (ADMIN)
GET    /api/sms-management/templates  · GET /solapi-templates · GET /solapi-balance # 템플릿·잔액
POST   /api/sms/webhook/solapi                                                      # Solapi 결과 콜백 (인증 X · 서명 검증)
# 관리자 배치용 대기열
GET    /api/admin/batch/sms/queue/status · /rows · /statuses                        # 대기열 조회
POST   /api/admin/batch/sms/queue/retry  · /run                                     # 실패 재실행·[지금 실행] (MANAGER+ / ADMIN)

# 계정 관리 (ADMIN 롤 전용 · 2026-09-16)
GET    /api/admin/users                     # 전체 목록 (프론트가 검색·필터·페이지)
POST   /api/admin/users                     # 신규 (loginId·email·name·role·department·password)
PUT    /api/admin/users/{id}                # 수정 (loginId 불변, password 빈 값이면 유지)
DELETE /api/admin/users/{id}                # 삭제 (본인·마지막 ADMIN 400)
```

> ✍️ **예외 — 사용자가 직접 입력하는 원천 데이터**는 배치 마트 파이프라인을 타지 않는다.
> - `드림렌즈 장부`(`dreamlens_ledger`): JPA 엔티티 CRUD (`etc/entity` + `JpaRepository` + `/api/dreamlens-ledger`).
>   스키마는 `ddl-auto: update` 가 생성하고, 초기 10행은 `etc/init/DreamlensLedgerSeeder` 가 표가 비었을 때만 넣는다.
> - `해외마케팅 접수리스트`(`overseas_marketing_sheet` · `sql/mart/marketing/tables/V64`): Google Sheet 1회성 이관 + 화면 수기 입력 혼합.
>   행 추가/수정/삭제는 `/api/overseas-marketing/receptions` (JDBC, `marketing/service/OverseasMarketingEditService`).
>   수기 행은 `origin='manual'` + 추가자(`created_by`=로그인 ID), 수정은 시트 원본 컬럼에 한정.
>   **조회는 마트만 읽는다**(`sql/mart/marketing/receptions.sql`): CRM 매칭은 `customer_no`/`matched_at`, 파생값(상태·수술정보·비용·외래)은
>   `crm_snapshot`(JSON) 으로 저장돼 있고, 갱신은 화면의 [CRM 동기화] 버튼(`POST /sync-crm`, 백그라운드 잡)으로만 수행한다.
>   CRM 조회 SQL(MSSQL)은 `sql/softcrm/marketing/`(customer-candidates·customer-details·exam/surgery-date-candidates·비용·외래) 에 둔다.
>   **매칭 3단계**: 매칭(`customer_no` 존재) / 확인필요(`candidate_customer_no`만 존재, **또는 미매칭인데
>   `exam_date` 에 실제 날짜(YYYY-MM-DD)가 있는 행** — 내원 이력이 있으므로 조회 시점에 승격, `receptions.sql` 파생) / 접수(둘 다 없음).
>   동기화 매칭 규칙 — 이름+생일(월일 스왑 허용) 유일 일치, 또는 전화 뒷8자리·이메일 유일 후보 + 생일 일치·스왑이면
>   자동 매칭(`matched_by='CRM_Sync'`); 유일 후보인데 생일이 다르거나 없으면 확인필요(`candidate_reason` 근거 저장).
>   수동 매칭은 고객번호 셀 클릭 팝업(`PUT /receptions/{row}/match`, `GET /crm-customers/{no}` 검증) →
>   `matched_by`=로그인 ID 로 저장되며 **행 수정·시트 재동기화에도 보존**된다.
>   자동 매칭 행은 수정 시 매칭·스냅샷을 비워 다음 CRM 동기화에서 재계산한다.
>   **동기화(sync-sheet)가 지나간 행은 삭제 불가·수정만 가능**(`locked_at`, 409 `RowLockedException`), 동기화는 수기 행,
>   화면에서 수정된 시트 행, 수동 매칭 행을 보존한다. 시트 동기화 버튼은 `OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED=false`(기본) 로 숨긴다.
> - `해외마케팅 예약통계`(`overseas_reservation_stats` · V65 + 시드 V66): ~2026-08-23 은 레거시 시트 시드, 이후는 접수리스트 자동 집계이며
>   일간 화면에서 수정한 셀(`source='manual'`)이 있으면 그 값이 우선한다(`PUT /reservation-stats/{date}`).

> 🔌 **화면은 마트를 읽는다.** 통계 API 는 배치가 적재한 Postgres 마트를 조회하고, MSSQL 직결은
> 배치(적재) 시간대에만 쓴다. 그래서 SSH 터널·VPN 이 끊겨도 화면은 마지막 적재분으로 동작한다.
> 신규 통계 API 를 만들 때 `statsJdbcTemplate`(MSSQL) 로 화면을 직접 붙이지 말 것 —
> 마트 테이블 + `@Primary` 마트 QueryService + 배치 Job 을 함께 만든다(예: `report` 도메인).
> 의사랑(IPLUS) 원천은 링크드서버 `[220.85.109.240]` OPENQUERY 로만 닿는다 — 안쪽 쿼리는 `sql/iplus/<domain>/*-inner.sql`(주석 가능) 에 두고
> `common/util/OpenQuerySql` 이 주석 제거·8,000자 검증·`__OQ_FROM__/__OQ_TO__` 치환·따옴표 이스케이프 후 감싼다. 원격 장애 대비 REQUIRES_NEW 로 격리한다(`accounting`·`etc` 참조).

> 📅 **주차 개념 3종 주의** — 이름이 비슷하지만 버킷 규칙이 다르다.
> - **ISO 연간 주차**(`utils/isoWeek.ts` · `WeeklyReportService`): 월~일, 첫 목요일이 든 주가 1주차, 한 해 52/53주. 주차 레포트·예약통계·수술별 비중 '주차' 탭이 쓴다.
> - **그 달의 주차**(`OverallExamWeeklyService`): 월 경계에서 잘라 각 달에 귀속 → 월 합계 = 그 달 주 합계. 주간 검사자 종합지표가 쓴다(백엔드 산정).
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

- TanStack Router **파일 기반 라우팅**. `src/routes` 파일 구조가 URL 이고, `@tanstack/router-plugin`(vite)이 `routeTree.gen.ts` 를 생성한다(커밋 대상 — `tsc -b` 가 vite 보다 먼저 돌기 때문). `autoCodeSplitting` 으로 페이지마다 청크가 나뉜다.
- 인증 필요 페이지는 `routes/_auth/` 아래에 둔다. `_auth/route.tsx` 의 `beforeLoad` 가 인증(`requireAuth`)과 페이지 접근 판정(`canAccess`)을 하고, `RouteGate` 가 결과에 따라 페이지 / placeholder(미완성) / 접근 권한 없음을 렌더한다.
- 파일명 규칙: `_xxx` = 경로 없는 레이아웃 · `(xxx)` = URL 에 안 붙는 폴더 묶음 · `-xxx` = 라우트 아님(라우트 전용 하위 컴포넌트·유틸·테스트) · `$xxx` = 경로 파라미터.
- **새 통계 페이지 연결**: ① `pages/<domain>/` 에 컴포넌트 작성 → ② `routes/_auth/stats/(<domain>)/<id>.tsx` 에 라우트 파일 추가(`component` + `staticData.page` 의 id·label·section·status·access, 미완성이면 apiDraftPath) → ③ `navigation.ts` `MENU_TREE` 에 경로 추가(숨길 거면 `HIDDEN_PAGE_PATHS`). 경로는 타입이 있어 없는 경로를 적으면 컴파일 에러.
- 훅은 `@/hooks/<domain>/useXxx`, API는 `@/api/<domain>`(리스트는 `@/api/<domain>/xxxList`)에서 import
- **pending(미완성) 메뉴 정책**: 운영 빌드(PROD)에서는 사이드바에서 **숨김** + 라우트 **차단**(직접 URL도 `StatsPlaceholderPage`). 개발 빌드에서는 미리보기 가능(사이드바 빨강 표시). 판정은 `canAccess`, 정책 불변식은 `config/pageAccess.test.ts`, 메타 선언 누락은 `routes/-internal/routeTree.test.ts` 가 보호한다.

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
- 🚫 **`main` 은 물론 `develop` 으로도 임의로 push·PR 하지 않는다.** 운영 반영은 **개발자와 협의해서** 진행한다.
  협의 없이 `gh pr create --base main` 을 만들거나 다른 브랜치로 밀지 말 것 — 개발자 브랜치와 어긋나면
  복구 비용이 크다(2026-08-05에 실제로 작업분이 갈라져 재적용이 필요했다).
- 브랜치 정리·머지 시점도 개발자 결정 사항이다. 이쪽에서는 `2026-09-04` 만 최신으로 유지한다.

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

## Claude에게 요청할 때 참고사항

- **새 통계 페이지**: 전용 페이지 컴포넌트 작성 → `routes/_auth/.../<id>.tsx` 라우트 파일 + `staticData.page`(롤·부서 권한은 `access`) → `navigation.ts` `MENU_TREE` 에 경로 추가 → 백엔드 API + `SecurityConfig` 매처 대칭 유지 (`routeTree.gen.ts` 직접 수정 금지)
- **새 차트**: Recharts 기반, shadcn `ChartContainer` 사용, `CHART_PALETTE` 색상 적용
- **새 UI 컴포넌트**: `npx shadcn@latest add <name>` (설정: `components.json`)
- **API 연동**: `api/client.ts` HTTP 클라이언트 사용, TanStack Query `useQuery`로 캐싱
- **DashboardPage 데이터는 하드코딩 목업** — API 연동 시 교체 필요
- **기획서 참조**: 메뉴별 화면 규칙·컬럼 정의·함정은 `backend/new_대쉬보드_v4/pages/<id>.html` (원문은 `_build/content/<id>.mjs`) · `prd.html` 「전메뉴 현황」 탭 · 지표 정의는 `지표정의/*.md` · DB 테이블은 `db/tables/`. 코드에서 자동 생성되는 1·6·7·8·9장(개요·데이터 소스·API·권한·연관 문서)은 `_build/scan.mjs → gen.mjs`, 2·3·4·5·10장은 사람이 쓴 본문.

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
