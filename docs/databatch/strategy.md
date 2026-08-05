# 데이터 배치 & 마트 전환 전략

> 작성일: 2026-07-02 · 최신화: 2026-08-05
> 상태: **Cutover 실질 완료** — 배치 파이프라인·마트 스키마·프로파일 전환 완료, 스냅샷 스토어 흡수(§7)도 완료
> 목적: CRM MSSQL 직결 조회 구조를 **Postgres 마트(Mart) 기반**으로 전환하기 위한 설계·마이그레이션 계획 및 **현재 이행 현황 기록**

> 📌 **이 문서는 "왜 이렇게 만들었나"(설계 근거·결정 이력)를 담는다.**
> 지금 배치가 **어떻게 도는지**(스케줄·마트별 write 정책·수동 실행 동작·min-year 가드)는
> [`batch-execution-rules.md`](./batch-execution-rules.md)가 정본이다. 둘이 어긋나면 그쪽이 맞다.

---

## 0. MSSQL 절대 규칙 — 배치가 원본을 읽을 때

> 구 `기획/dashboard-spec.md` §2 에서 옮겨왔다. CRM MSSQL 은 EyeChartPro 와 공유하는 **운영계** DB다.

- **SELECT only** — INSERT/UPDATE/DELETE 엄격 금지
- 모든 통계·배치 조회 서비스는 `@Transactional(readOnly = true)`
- HikariCP `read-only=true`, `maximum-pool-size=3`
- ⚠️ **MSSQL 2014 호환** — `STRING_AGG`, `TRIM` 등 최신 함수 **사용 불가**
- 대용량 테이블은 `WITH(NOLOCK)` + 날짜 범위 필수
- 접속 정보: `220.85.109.247:1433 / SOFTCRM` (자격증명은 `backend/.env`, gitignored)

---

## 1. 배경 및 목표

### 현재 구조의 문제

- 매 API 호출마다 CRM MSSQL에 직접 붙어 무거운 쿼리 실행 (`LIKE '%SMILE%'`, `COUNT(DISTINCT ...)`, `UNION ALL`, `OUTER APPLY` 다수)
- CRM은 EyeChartPro와 공유되는 운영계 DB — 대시보드 부하가 운영 업무에 영향
- 조회마다 재계산되어 응답 지연 (특히 리스트: 40+ 컬럼, 다중 조인)
- 파일 캐시(`.cache/stats/`)와 `*SnapshotStore`가 부분적으로 이 역할을 하고 있으나 일관성 없음

### 목표 구조

```
[매일 03:00 Spring @Scheduled]
             │
             ▼
   ┌─────────────────────┐
   │  BatchOrchestrator   │
   └────┬───────────┬─────┘
    read│           │write
        ▼           ▼
  ┌──────────┐  ┌──────────────────────┐
  │  MSSQL   │  │  Postgres (Primary)   │
  │  (CRM,   │  │  mart_*, list_*       │
  │ read-only│  │  (Cutover 완료 후 유일 소스)│
  └──────────┘  └──────────▲───────────┘
                            │read
                    ┌───────┴──────┐
                    │  Spring API   │
                    └───────▲──────┘
                            │
                        Frontend
```

- **모든 클라이언트 조회는 Postgres 마트만 참조**
- CRM MSSQL은 **배치 시점(하루 1회)** 에만 접근
- T-1 데이터로 충분 (실시간성 불필요, 지표 확인 용도)

---

## 2. 핵심 결정 사항 (합의됨)

| # | 항목 | 결정 | 이행 상태 |
|---|------|------|---------|
| 1 | 재적재 범위 | **매일 어제(D-1) 하루치만 append** (최경량 방식) | ✅ 이행 완료 (`BatchOrchestrator.runDaily`) |
| 2 | 리스트 실시간성 | **불필요** — 리스트도 T-1 마트로 통합 | ✅ 이행 완료 (`list_*` 4종) |
| 3 | PII 처리 | **CRM 원본 그대로 복제** (익명화·마스킹 없음) | ✅ 이행 완료 |
| 4 | Cutover 방식 | **페이지별 `@Profile` 전환** (안전, 롤백 쉬움) | ✅ 이행 완료 (프로파일: `mssql`, `postgres-mart`) |
| 5 | 스냅샷 스토어 | **마트로 흡수 후 삭제** (`SurgerySnapshotStore` 등) | ✅ 이행 완료 — 수술 2026-07-31, 예약통계 2종은 V19/V20 마트 + `period_lock`. §7 참조 |
| 6 | 배치 러너 | **Spring `@Scheduled`** (Airflow는 이번 스코프 밖) | ✅ 이행 완료 |

### 결정 1의 함의 및 완화책 — ⚠️ 중요

**"어제 하루치만 append"의 리스크**: CRM에서 과거 데이터가 소급 수정(수술코드 정정, 취소 처리 등)돼도 마트에는 반영되지 않는다.

**완화책 (이행 상태)**:
- ✅ **관리자 수동 재적재 API**: `POST /api/admin/batch/rerun?from=YYYY-MM-DD&to=YYYY-MM-DD&domain=ALL|SURGERY|RESERVATION|EXAM|CONSULTATION|OUTPATIENT|OVERALL|ETC` (`BatchAdminController`)
- ✅ **월말 자동 재적재 잡**: 매월 1일 03:30, 전월 전체 재계산 (`BatchOrchestrator.runMonthlyReconcile`, 별도 클래스 아닌 오케스트레이터 메서드로 구현)
- ✅ **집계 마트는 upsert, 리스트는 delete+insert**: `sql/mart/upsert-*.sql`, `sql/mart/delete-list-*-range.sql` + `insert-list-*.sql` 조합
- ✅ **도메인별 세부 재적재 API**: 도메인마다 월별/일별/리스트 단위로 `ReconcileService` 17개 엔드포인트 추가 제공 (스펙 초과 달성)

---

## 3. 데이터소스 구성 (구현 완료)

### Spring Datasource 설계 (실제 구성)

두 개의 `@Configuration` 클래스가 프로파일별로 활성화된다.

- `common/config/MartDataSourceConfig.java` — `@Profile("postgres-mart")`
  - `@Primary`: JPA/JdbcTemplate 기본 대상 = Postgres 마트
  - `@Bean("statsDataSource")` + `@Bean("statsJdbcTemplate")` = MSSQL(배치 전용)
- `common/config/StatsDataSourceConfig.java` — `@Profile("mssql")`
  - MSSQL 직결 시절의 조회 경로. Cutover 완결 후 제거 대상

빈 명명: MSSQL 쪽 빈 이름은 문서 초안의 `mssqlDataSource`가 아니라 **`statsDataSource`**로 통일됨. 배치·직결 어느 경로든 동일한 `@Qualifier("statsDataSource")`로 MSSQL을 참조할 수 있음.

### application-*.yml (실제 파일)

| 파일 | 용도 | 핵심 설정 |
|-----|------|---------|
| `application.yml` | 공통 기본 (H2) | 개발 편의용 기본값 |
| `application-local.yml` | 로컬 개발 | `batch.mart.enabled: false` (CRM 접근 없이 프론트 개발) |
| `application-dev.yml` | 개발 환경 | Docker Postgres 연결, 배치 옵션 |
| `application-mssql.yml` | (레거시) MSSQL 직결 조회 | Cutover 완료 후 제거 예정 |
| `application-postgres.yml` | Postgres 조회(JPA 기본 저장소) | |
| `application-postgres-mart.yml` | **운영 조회 + 배치 실행** | `batch.mart.daily-cron: 0 0 3 * * *`, `batch.mart.monthly-reconcile-cron: 0 30 3 1 * *`, `batch.mart.min-year: 2026` (24·25 레거시 시드 보호) |
| `application-prod.yml` | 운영 프로파일 그룹 | `postgres-mart` 활성화, 배치 enabled |

---

## 4. 마트 스키마 카탈로그

마이그레이션 스크립트: `backend/src/main/resources/sql/mart/V{1..32}__*.sql`
(Flyway 가 아니라 `MartSchemaInitializer` 가 순서대로 실행한다 — 새 `V**.sql` 은 **거기 등록해야** 적용된다.)

> **마트 ↔ 메뉴 대응표는 [`mart-menu-mapping.md`](./mart-menu-mapping.md)** 가 정본이다.
> 아래 표는 도입 순서를 남기려는 것이라 최신 목록은 `sql/mart/` 디렉토리를 직접 볼 것.

### 4.1 집계 마트 (aggregate) — 도입 순서

| 마트 테이블 | DDL 위치 | 페이지 | 상태 |
|-----------|--------|-------|------|
| `mart_surgery_monthly` | V2 | surgery | ✅ |
| `mart_surgery_daily` | V2 | surgery | ✅ |
| `mart_reservation_monthly` | V3 | reservation | ✅ |
| `mart_reservation_kakao_daily` | V3 | reservation-overall (카카오 채널) | ✅ |
| `mart_examination_monthly` | V4 | examination | ✅ |
| `mart_procedure_exam_monthly` | V4 | procedure-exam | ✅ |
| `mart_consultation_rate_monthly` | V5 | consultation-rate | ✅ |
| `mart_reservation_rate_monthly` | V5 | cataract-reservation-rate | ✅ |
| `mart_stop_reason_monthly` | V5 | stop-reason | ✅ |
| `mart_outpatient_count_monthly` | V6 | outpatient-count | ✅ |
| `mart_overall_exam_weekly` | V7 | overall-exam-weekly | ✅ |
| `mart_b2b_revenue_monthly` | V8 | b2b-revenue | ✅ |
| `mart_overall_exam_monthly` | V10 | overall-exam (26년+ 라이브, 24·25는 프론트 하드코딩) | ✅ |

**V10 이후 추가된 마트** (2026-08-05 기준 V32 까지):

| 마트 테이블 | DDL | 페이지 |
|-----------|-----|-------|
| `mart_reservation_stats_system_daily` | V11 (+V19 시드·`period_lock`) | 예약통계_시력교정 |
| `mart_reservation_stats_cataract_daily` | V11 (+V20 시드·`period_lock`) | 예약통계_백내장 |
| `mart_reservation_overall_monthly` | V12 (+V24 2026-H1 골든 시드) | 예약 종합 · 월간 레포트 |
| `mart_list_reservation_homepage` | V21 | 예약자 리스트_홈페이지 (MariaDB 소스) |
| `mart_outpatient_list` | V25 | 외래수 리스트 |
| `mart_weekly_report` | V28 (+V29~V31 드림렌즈) | 주차 레포트 |
| `mart_exam_count_by_class` | V28 | 고객분류별 검사수 |

**초안 대비 변경된 결정**:
- `mart_surgery_ratio_monthly`, `mart_surgery_composition_monthly` **별도 신설 안 함** — `surgery-composition` 일별 조회는 **기존 `mart_surgery_daily`** 재활용으로 2026-07-31 Cutover 완료 (`SurgeryCompositionMartQueryService` @Primary). 파일 스냅샷(`SurgerySnapshotStore`)은 삭제됨. `surgery-ratio` 는 `mart_surgery_monthly` 기반
- `mart_reservation_trend`, `mart_reservation_composition` **신설 안 함** — 트렌드는 `mart_reservation_monthly`에서 파생
- `mart_outpatient_count_daily` → 일별 아닌 **월별**(`mart_outpatient_count_monthly`)로 변경

### 4.2 리스트 마트 (list) — **구현된 4개**

| 마트 테이블 | DDL 위치 | 페이지 | 파티셔닝 |
|-----------|--------|-------|--------|
| `list_surgery` | V2 | surgery-list | ❌ 미구현 (단일 테이블) |
| `list_reservation` | V3 | reservation-list | ❌ 미구현 |
| `list_exam` | V4 | exam-list, all-exam-list | ❌ 미구현 |
| `list_cataract_exam` | V4 | cataract-exam-list, all-exam-list | ❌ 미구현 |

- **파티셔닝은 아직 미도입**. 초안의 `RANGE(*_date)` 월별 파티션 계획은 데이터 볼륨 임계치 도달 전까지 보류.
- 재적재는 `delete-list-*-range.sql` + `insert-list-*.sql` 조합의 delete+insert로 처리.

### 4.3 메타 테이블 (V1)

| 테이블 | 목적 | 실제 컬럼 |
|-------|------|---------|
| `batch_run_log` | 배치 실행 이력 | job_name, run_type(DAILY/MONTHLY_RECONCILE/MANUAL), target_from/to, status(RUNNING/SUCCESS/FAILED), rows_upserted, started_at, finished_at, duration_ms, error_message |
| `batch_watermark` | 마트별 마지막 성공 적재 시각 | mart_name(PK), last_loaded_at, updated_at |

### 4.4 레거시 시드 (V9)

`V9__legacy_seed.sql` — 2024~2025년치 히스토리 데이터가 CRM에 없는 항목(수술·검사 등)을 마트에 직접 적재. 배치 재실행 시 덮어쓰지 않도록 `batch.mart.min-year=2026` 가드가 함께 동작.

---

## 5. 배치 아키텍처 (구현 완료)

### 5.1 컴포넌트 구성 (실제 파일)

```
com.bviit.analytics.batch/
├── BatchConfig                     // @Profile("postgres-mart") 스코프 정의
├── BatchOrchestrator               // @Scheduled 진입점 (runDaily, runMonthlyReconcile, runManual)
├── MartSchemaInitializer           // V1..V9 마이그레이션 스크립트 부팅 시 적용
├── dto/
│   └── BatchRunLog                 // 실행 이력 값 객체
├── repository/
│   ├── BatchRunLogRepository       // batch_run_log CRUD
│   └── WatermarkRepository         // batch_watermark 조회·갱신
├── BatchSlackNotifier               // 실패 시 Slack 알림
├── job/  (Job + Writer 페어 10쌍 = 20 파일)
│   ├── SurgeryMartJob               + SurgeryMartWriter
│   ├── ReservationMartJob           + ReservationMartWriter
│   ├── ReservationListHomepageMartJob + …Writer   // MariaDB 소스, 가장 먼저 실행
│   ├── ReservationStatsDailyMartJob + …Writer     // 예약통계 2종 (period_lock)
│   ├── ExamMartJob                  + ExamMartWriter
│   ├── ReportMartJob                + ReportMartWriter   // 주차 레포트·고객분류별
│   ├── ConsultationMartJob          + ConsultationMartWriter
│   ├── OutpatientMartJob            + OutpatientMartWriter
│   ├── OverallMartJob               + OverallMartWriter
│   └── EtcMartJob                   + EtcMartWriter
└── admin/
    ├── BatchAdminController              // /api/admin/batch/**
    ├── SurgeryReconcileService
    ├── ReservationReconcileService
    ├── ExamReconcileService
    ├── ConsultationReconcileService
    ├── OutpatientReconcileService
    ├── OverallReconcileService
    └── EtcReconcileService
```

**초안 대비 실제 명명 변경**:
- 초안의 `SurgeryDailyMartJob`/`MonthlyMartJob`/`ListMartJob` 분리 → 도메인마다 **`*MartJob`(orchestration) + `*MartWriter`(persistence)** 페어로 통합
- 초안의 `MonthlyReconcileJob` 단일 클래스 → 별도 클래스 없이 `BatchOrchestrator.runMonthlyReconcile()` 메서드로 구현 (재사용 대상이 도메인 잡들이라 오케스트레이터 안에 두는 게 자연스러웠음)

### 5.2 각 잡의 트랜잭션 경계 (구현 기준)

1. `statsJdbcTemplate` (MSSQL)로 D-1 또는 지정 범위 데이터 조회
2. Postgres 트랜잭션 시작 (`@Transactional`, Writer 계층)
3. 리스트: `delete-list-*-range.sql` → `insert-list-*.sql`
4. 집계: `upsert-*.sql` (`INSERT ... ON CONFLICT DO UPDATE`)
5. `WatermarkRepository.upsert()`로 `batch_watermark` 갱신
6. `BatchRunLogRepository`에 성공 기록
7. 커밋

**실패 시**: 롤백 후 `batch_run_log`에 `FAILED` + `error_message` 기록 → **Slack 알림 발송**
(`BatchSlackNotifier`, `LOGGING_SLACK_*` 프로파일별 활성).

> ⚠️ **`POST /rerun` 은 실패해도 `{"ok":true}` 를 돌려준다.** 오케스트레이터가 요청을 접수했다는 뜻일 뿐이다.
> 실제 성공 여부는 반드시 `GET /api/admin/batch/run-logs?limit=1` 로 `status=SUCCESS`·`errorMessage=null` 을 확인할 것.

### 5.3 스케줄 (실제 크론)

| 잡 | 주기 | 처리 범위 | 진입점 |
|----|-----|---------|-------|
| Daily append | `0 0 3 * * *` (Asia/Seoul) | D-1 하루 | `BatchOrchestrator.runDaily()` |
| Intraday | `매일 10:00` | D-1 | 예약통계 일별 마트만 재실행 (콜센터 늦반영 흡수) |
| Monthly reconcile | `0 30 3 1 * *` | 전월 전체 upsert | `BatchOrchestrator.runMonthlyReconcile()` — **현재 비활성**(cron `-`) |
| Admin rerun | 수동 | 지정 범위 | `BatchAdminController` |

로컬 개발 시 `application-local.yml`의 `batch.mart.enabled: false`로 배치 스케줄 자체가 비활성화된다.
정확한 현행 스케줄·마트별 정책은 [`batch-execution-rules.md`](./batch-execution-rules.md) §1 참조.

---

## 6. Cutover 전략 (페이지별 전환)

### 6.1 원칙 (이행 완료)

- ✅ **레포지토리 레벨에서 스위치**: `SurgeryStatsRepository` 인터페이스에 `@Profile({"mssql","postgres-mart"})`, 각 구현체는 `@Profile("mssql")` / `@Profile("postgres-mart")`
- ✅ **한 페이지씩 이행**: 마트 채워진 도메인부터 순차 스위치
- ✅ **롤백 용이**: 프로파일 원복 시 즉시 MSSQL 직결로 복귀 (`application-mssql.yml` 유지 중)

### 6.2 도메인별 인터페이스 (실제 코드)

```
public interface SurgeryStatsRepository { ... }                              // 공통 인터페이스

@Service @Profile("mssql")
class SurgeryStatsService implements SurgeryStatsRepository { ... }          // MSSQL 직결

@Repository @Profile("postgres-mart")
class SurgeryStatsMartRepository implements SurgeryStatsRepository { ... }   // 마트

@Service @Profile("postgres-mart") @Primary
class SurgeryMartQueryService { ... }                                        // 마트 조회 조립
```

동일 패턴이 **reservation, exam, consultation, outpatient, overall, etc** 7개 도메인 전부에 적용되어 있음.

### 6.3 페이지 전환 진행 상황

| Phase | 도메인 | 페이지 | 상태 |
|-------|-------|-------|-----|
| 1 | 수술 | surgery, surgery-list | ✅ 마트 스위치 완료 |
| 1 | 수술 | surgery-composition | ✅ 마트 스위치 완료 (2026-07-31, `mart_surgery_daily` 재활용, 스냅샷 삭제) |
| 1 | 수술 | surgery-ratio | ✅ 마트 스위치 완료 (`mart_surgery_monthly` 기반) |
| 2 | 예약 | reservation, reservation-list, reservation-overall(카카오) | ✅ 마트 스위치 완료 |
| 2 | 예약 | reservation-stats-system, reservation-stats-cataract | ⚠️ 스냅샷 스토어 유지 중 |
| 3 | 검사 | examination, procedure-exam, exam-list, cataract-exam-list, all-exam-list | ✅ 마트 스위치 완료 (all-exam-list 는 list_exam + list_cataract_exam UNION 조회로 재활용) |
| 3 | 검사 | overall-exam (월별) | ✅ V10 마트 스위치 완료 (26년+, 24·25는 프론트 하드코딩 병합) |
| 4 | 전환·성공률 | consultation-rate, cataract-reservation-rate, stop-reason, stop-rate | ✅ 마트 스위치 완료 |
| 5 | 외래·전체·기타 | outpatient-count, overall-exam-weekly, b2b-revenue | ✅ 마트 스위치 완료 |

---

## 7. 스냅샷 스토어 마이그레이션 — ✅ 완료

> 2026-07-31: **수술(surgery-composition)** 은 파일 스냅샷을 폐지하고 `mart_surgery_daily` 로 통합.
> **예약통계 2종**도 마트로 이관 완료 — `mart_reservation_stats_{system,cataract}_daily`(V11)
> + 2026-H1 시드(V19/V20) + `reservation_stats_period_lock` 잠금 + `reservation_stats_override` 셀 보정.

### 7.1 이관 결과

| 종전 파일 스토어 | 대체 |
|---|---|
| ~~`surgery/service/SurgerySnapshotStore`~~ | `mart_surgery_daily` (`SurgeryCompositionMartQueryService` @Primary) |
| ~~`ReservationStatsSnapshotStore`~~ | `mart_reservation_stats_system_daily` + `period_lock` + `override` |
| ~~`CataractStatsSnapshotStore`~~ | `mart_reservation_stats_cataract_daily` + `period_lock` + `override` |

**§7.3 이 제기했던 "편집 vs 재적재 충돌" 문제는 이렇게 풀렸다** — 관리자 확정 워크플로우는
`locked` 컬럼이 아니라 **별도 잠금 테이블**(`reservation_stats_period_lock`)로, 셀 수기 보정은
**INSERT-only audit 테이블**(`reservation_stats_override`)로 분리했다. 배치는 잠긴 period 를 스킵하고,
override 는 조회 시점에 서비스가 얹는다 — 즉 **배치 write 경로와 편집 경로가 서로 안 만난다.**
자세한 동작은 [`mart-menu-mapping.md`](./mart-menu-mapping.md) §2-4·§3-3·§4-2 참조.

### 7.2 수술 이행 결과 (2026-07-31)

- `SurgeryCompositionReader` 인터페이스 신설 — 두 프로파일 대칭 규약.
- `SurgeryCompositionMartQueryService` (@Primary, postgres-mart) — `mart_surgery_daily` 조회.
- `SurgeryCompositionQueryService` (mssql 전용) — 소스 라이브 집계로 단순화, read-through fill 폐지.
- `SurgeryStatsService`의 `fillSnapshot`/`saveSnapshot` 삭제. `SurgerySnapshot` DTO·`SurgerySnapshotStore` 삭제. 컨트롤러의 `/fill`·`/snapshot`·`/snapshots` 엔드포인트 삭제.
- 프론트 `SurgeryDailyMeta`에서 `confirmedAt`/`confirmedBy` 필드 제거, `SNAPSHOT` source 삭제 · `MART` 배지 추가.
- 조회 시점에 MSSQL 을 두드리는 경로가 완전히 사라짐 — 배치가 유일한 write 창.

---

## 8. 마이그레이션 순서 (진행 현황)

| PR | 내용 | 상태 |
|----|------|-----|
| **PR-1** | Datasource 이중화, Postgres 스키마 초안, `batch_run_log`/`batch_watermark`, `BatchOrchestrator` 뼈대 | ✅ 완료 (`MartDataSourceConfig`, `StatsDataSourceConfig`, `V1__batch_meta.sql`) |
| **PR-2** | 수술 도메인 마트(monthly/daily/list) + `SurgeryMartJob`·`SurgeryMartWriter`·`SurgeryStatsMartRepository` | ✅ 완료 (`V2__surgery_mart.sql`) |
| **PR-3** | Phase 1 Cutover (surgery 페이지 프로파일 스위치) | ✅ 완료 — surgery/surgery-list/surgery-ratio/surgery-composition 모두 마트. 2026-07-31 surgery-composition도 `mart_surgery_daily` 로 스위치, 스냅샷 파일 폐지 |
| **PR-4** | 예약 마트 + Phase 2 Cutover | ⚠️ 부분 완료 (`V3__reservation_mart.sql`) — reservation-stats-system/cataract는 스냅샷 유지 |
| **PR-5** | 검사 마트 + Phase 3 Cutover | ✅ 완료 (`V4__exam_mart.sql`) |
| **PR-6** | 전환·성공률 마트 + Phase 4 Cutover | ✅ 완료 (`V5__consultation_mart.sql`) |
| **PR-7** | 나머지 마트(외래·전체·기타) + Phase 5 Cutover | ✅ 완료 (`V6..V8`, `V10__overall_exam_monthly.sql`) |
| **PR-8** | Monthly reconcile 잡, Admin rerun API, 파일캐시·스냅샷 스토어 코드 제거 | ✅ 완료 (§7) |
| **PR-9** *(신규)* | 미구현 마트 착수 여부 결정 (surgery-ratio/composition, reservation-trend/composition) | ✅ 결정 완료 — 신설 안 함(§4.1) |
| **PR-10** *(신규)* | 스냅샷 스토어 흡수 (§7 전체) | ✅ 완료 — 수술 2026-07-31 · 예약통계 2종 V19/V20 |
| **PR-11** *(신규)* | 배치 실패 알림 채널 (Slack/이메일) | ✅ 완료 (`BatchSlackNotifier`) |
| **PR-12** *(신규)* | 리스트 마트 파티셔닝 도입 시점 판단 | 백로그 (§10) |
| **PR-13** *(신규)* | 주차 레포트·고객분류별 마트(`ReportMartJob`, V28~V31) | ✅ 완료 — 화면의 MSSQL 의존 제거 |

---

## 9. 리스크 & 완화 (현행 상태)

| 리스크 | 완화책 | 상태 |
|-------|-------|-----|
| CRM 소급 수정이 마트에 반영 안 됨 | 월말 자동 재계산 + 관리자 수동 재적재 API + 도메인별 reconcile 엔드포인트 | ✅ 이행 |
| 배치 실패 시 데이터 공백 | `batch_run_log` 모니터링, 재실행 idempotent (upsert/delete+insert) | ✅ 이행 — 로그 + Slack 알림 |
| 마트 vs 직결 값 차이 (검증 실패) | Phase마다 대사 스크립트 필수 — 최근 3개월 값 일치 확인 후 스위치 | ⚠️ 통합테스트는 Writer→Repo 왕복 검증만 있음, 마트 vs 직결 대사 자동화 부재 |
| Postgres 디스크 증가 (리스트 마트) | 월별 파티션 + 오래된 파티션 아카이빙 (2년 이상 zip/삭제) | ❌ **미구현** — 데이터 볼륨 도달 전까지 보류 |
| CRM 스키마 변경 시 배치 깨짐 | `docs/db/tables/*.md` 갱신 + 배치 통합테스트 스키마 스모크 | ⚠️ 문서 갱신 정책은 존재, 스모크 테스트는 부분 |
| PII 확산 (Postgres 복제) | 배치·API 서비스 계정으로만 접근 제한, 감사 로그 활성화 | ⚠️ 접근 통제는 인프라 계정 레벨, 감사 로그 활성화 여부는 운영측 확인 필요 |
| **레거시 24·25 데이터 소실** | `V9__legacy_seed.sql` + `batch.mart.min-year=2026` 가드 | ✅ 이행 완료 (2026-06-02 이후 확립) |
| ~~스냅샷 파일 유실~~ | 마트 흡수 완료로 소멸 (§7) | ✅ 해소 |

---

## 10. 오픈 이슈

### 해결됨

- [x] **Postgres 인프라** — 기존 Postgres 인스턴스를 마트 저장소로 재사용 (`application-postgres-mart.yml`)
- [x] **Admin rerun API 인증·인가** — Spring Security `/api/admin/**` = `hasRole("ADMIN")` (JWT 재사용)
- [x] **`LEGACY_VISION_SURGERY` 처리** — 서비스 레이어에서 보정 후 마트에 저장 (24·25 레거시 상수는 제거되고 `V9__legacy_seed.sql`로 이관됨)
- [x] **로컬 개발 마트 의존성** — `application-local.yml`에서 `batch.mart.enabled: false`로 배치 자체 비활성화, 프론트 개발은 mock/H2 조합 유지

### 남아 있는 이슈

- [ ] **리스트 파티션 도입 시점 & 보관 기간** — 현재 미도입, 데이터 볼륨 임계치 정의 필요 (PR-12)
- [ ] **마트 vs 직결 값 대사 자동화** — 통합테스트는 왕복 검증만, MSSQL 직결 값과 실제 대사하는 자동화 테스트 부재.
      단 도메인별 `reconcile-*` 엔드포인트로 **수동 대조는 가능**하다(예: `GET /api/admin/batch/exam/reconcile-procedure-exam?years=2026`)
- [ ] **Monthly reconcile 재활성 여부** — 현재 cron `-` 로 꺼져 있다. 소급 수정 흡수는 수동 rerun 에 의존 중

### 대시보드 전반의 보류된 결정 (Deferred)

> 구 `기획/dashboard-spec.md` §9 에서 옮겨왔다. 배치 범위 밖이지만 기록을 남긴다.

- 토큰 갱신 / httpOnly 쿠키 마이그레이션
- 역할 기반 인가(RBAC) — 현재는 `/api/admin/**` = `hasRole("ADMIN")` 단일 구분만
- 의사·채널 마스터 데이터 소스
- 실시간 WebSocket 업데이트
- 타임존 정규화 (MSSQL 서버 vs Spring 서버)

---

## 11. 참고

### 코드 자산

- 마트 마이그레이션 스크립트: `backend/src/main/resources/sql/mart/V{1..32}__*.sql` (`MartSchemaInitializer` 가 실행)
- 마트 upsert/select/delete SQL: `backend/src/main/resources/sql/mart/*.sql`
- 도메인별 원본 SQL(직결 시절): `backend/src/main/resources/sql/{domain}/*.sql`
- 배치 컴포넌트: `backend/src/main/java/com/bviit/analytics/batch/`
- 통합테스트: `backend/src/test/java/com/bviit/analytics/batch/job/*MartWriterIT.java` (Testcontainers Postgres)

### 참조 문서

- 배치 실행 규칙·마트별 정책(정본): [`batch-execution-rules.md`](./batch-execution-rules.md)
- 마트 ↔ 메뉴 매핑: [`mart-menu-mapping.md`](./mart-menu-mapping.md)
- 홈페이지 소스 전략: [`legacy-homepage-source-strategy.md`](./legacy-homepage-source-strategy.md)
- DB 테이블 문서(CRM MSSQL 스키마): [`../db/tables/`](../db/tables/)
- 레거시 Airflow ETL 대조: [`../db/airflow-레거시-대조.md`](../db/airflow-레거시-대조.md)
- 프로젝트 표준·컨벤션: `CLAUDE.md`, `AGENTS.md`

### 관련 프로파일

| 프로파일 | 조회 소스 | 배치 실행 |
|---------|---------|---------|
| `local` | H2/Postgres | ❌ 비활성 |
| `dev` | Postgres | 선택 |
| `mssql` | MSSQL 직결 | ❌ (Cutover 이전 폴백용) |
| `postgres-mart` | Postgres 마트 | ✅ (`@Scheduled` 활성) |
| `prod` | `postgres-mart` 포함 | ✅ |
