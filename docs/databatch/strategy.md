# 데이터 배치 & 마트 전환 전략

> 작성일: 2026-07-02 · 최신화: 2026-08-05
> 상태: **Cutover 실질 완료** — 배치 파이프라인·마트 스키마·프로파일 전환 완료, 스냅샷 스토어 흡수(§7)도 완료
> 목적: CRM MSSQL 직결 조회 구조를 **Postgres 마트(Mart) 기반**으로 전환하기 위한 설계·마이그레이션 계획 및 **현재 이행 현황 기록**

> 📌 **이 문서는 "왜 이렇게 만들었나"(설계 근거·결정 이력)를 담는다.**
> 지금 배치가 **어떻게 도는지**(스케줄·마트별 write 정책·수동 실행 동작·min-year 가드)는
> **§12 배치 실행 규칙**에 있다(구 `batch-execution-rules.md`). 둘이 어긋나면 §12 가 맞다.

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
| 4 | Cutover 방식 | **페이지별 `@Profile` 전환** (안전, 롤백 쉬움) | ✅ 이행 완료 · `mssql` 프로파일은 2026-08-19 완전 제거 (현재 `postgres-mart` 단일) |
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

단일 `@Configuration` 클래스가 활성화된다 (2026-08-19 `mssql` 프로파일 제거 후).

- `common/config/MartDataSourceConfig.java` — `@Profile("postgres-mart")`
  - `@Primary`: JPA/JdbcTemplate 기본 대상 = Postgres 마트
  - `@Bean("statsDataSource")` + `@Bean("statsJdbcTemplate")` = MSSQL(배치·브릿지·reconcile 전용)

빈 명명: MSSQL 쪽 빈 이름은 **`statsDataSource`**로 통일. `@Qualifier("statsDataSource")`로 참조.

### application-*.yml (실제 파일)

| 파일 | 용도 | 핵심 설정 |
|-----|------|---------|
| `application.yml` | 공통 기본 (H2) | 개발 편의용 기본값 |
| `application-local.yml` | 로컬 개발 | `batch.mart.enabled: false` (CRM 접근 없이 프론트 개발) |
| `application-dev.yml` | 개발 환경 | Docker Postgres 연결, 배치 옵션 |
| `application-postgres-mart.yml` | **운영 조회 + 배치 실행** | `batch.mart.daily-cron: 0 0 3 * * *`, `batch.mart.monthly-reconcile-cron: 0 30 3 1 * *`, `batch.mart.min-year: 2026` (24·25 레거시 시드 보호). `local`/`dev`/`prod` 프로파일 그룹이 자동 include. |
| `application-prod.yml` | 운영 프로파일 그룹 | `postgres-mart` 활성화, 배치 enabled |

---

## 4. 마트 스키마 카탈로그

마이그레이션 스크립트: `backend/src/main/resources/sql/mart/V{1..32}__*.sql`
(Flyway 가 아니라 `MartSchemaInitializer` 가 순서대로 실행한다 — 새 `V**.sql` 은 **거기 등록해야** 적용된다.)

> **마트 ↔ 메뉴 대응표는 §11** 이 정본이다.
> 아래 표는 도입 순서를 남기려는 것이라 최신 목록은 `sql/mart/` 디렉토리를 직접 볼 것.

### 4.1 집계 마트 (aggregate) — 도입 순서

| 마트 테이블 | DDL 위치 | 페이지 | 상태 |
|-----------|--------|-------|------|
| `mart_surgery_monthly` | V2 | surgery | ✅ |
| `mart_surgery_daily` | V2 | surgery | ✅ |
| `mart_reservation_monthly` | V3 | reservation | ✅ |
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
정확한 현행 스케줄·마트별 정책은 **§12-1** 참조.

---

## 6. Cutover 전략 (페이지별 전환)

### 6.1 원칙 (이행 완료)

- ✅ **레포지토리 레벨에서 스위치**: 소스 서비스와 마트 QueryService 를 같은 프로파일(`postgres-mart`)에 두고 후자에 `@Primary` 로 우선순위 부여
- ✅ **한 페이지씩 이행**: 마트 채워진 도메인부터 순차 스위치
- ✅ **롤백 용이**: Cutover 기간에는 프로파일 스위치로 즉시 MSSQL 직결 복귀 가능했음 (2026-08-19 `mssql` 프로파일 완전 제거 · 필요 시 git 히스토리에서 복원)

### 6.2 도메인별 인터페이스 (실제 코드)

```
public interface SurgeryStatsRepository { ... }                              // 공통 인터페이스

@Service @Profile("postgres-mart")
class SurgeryStatsService implements SurgeryStatsRepository { ... }          // MSSQL 직결 (배치 소스·reconcile 용)

@Repository @Profile("postgres-mart")
class SurgeryStatsMartRepository implements SurgeryStatsRepository { ... }   // 마트

@Service @Profile("postgres-mart") @Primary
class SurgeryMartQueryService { ... }                                        // 마트 조회 조립 · 화면은 이 구현이 주입됨
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
자세한 동작은 **§11-2-4 · §11-3-3 · §11-4-2** 참조.

### 7.2 수술 이행 결과 (2026-07-31)

- `SurgeryCompositionReader` 인터페이스 신설 — 마트 QueryService 를 위한 규약.
- `SurgeryCompositionMartQueryService` (@Primary, postgres-mart) — `mart_surgery_daily` 조회.
- (2026-08-19 `SurgeryCompositionQueryService` 삭제 — mssql 프로파일 제거와 함께 dead code 정리)
- `SurgeryStatsService`의 `fillSnapshot`/`saveSnapshot` 삭제. `SurgerySnapshot` DTO·`SurgerySnapshotStore` 삭제. 컨트롤러의 `/fill`·`/snapshot`·`/snapshots` 엔드포인트 삭제.
- 프론트 `SurgeryDailyMeta`에서 `confirmedAt`/`confirmedBy` 필드 제거, `SNAPSHOT` source 삭제 · `MART` 배지 추가.
- 조회 시점에 MSSQL 을 두드리는 경로가 완전히 사라짐 — 배치가 유일한 write 창.

---

## 8. 마이그레이션 순서 (진행 현황)

| PR | 내용 | 상태 |
|----|------|-----|
| **PR-1** | Datasource 이중화, Postgres 스키마 초안, `batch_run_log`/`batch_watermark`, `BatchOrchestrator` 뼈대 | ✅ 완료 (`MartDataSourceConfig`, `V1__batch_meta.sql`) — 이전에 있던 `StatsDataSourceConfig` 는 2026-08-19 mssql 프로파일 제거와 함께 삭제, stats DataSource 는 `MartDataSourceConfig` 로 통합됨 |
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

## 11. 마트 ↔ 메뉴 매핑과 데이터 흐름

> 구 `mart-menu-mapping.md`(2026-07-15)를 흡수했다.
> **"이 화면 숫자는 어디서 오는가" · "화면에서 값을 바꾸면 다른 지표에도 반영되는가"**에 대한 표준 답이다.


---

### 0. TL;DR

- **모든 지표 숫자 = 마트 테이블에 미리 저장된 값을 그대로 조회**. 프론트 계산·재집계 없음.
- **각 배치는 MSSQL 원본을 독립적으로 읽어 자기 도메인 규칙으로 계산 → 자기 마트에 upsert**. 마트끼리 참조하지 않음.
- **매일 03시 배치가 그 달 전체를 다시 계산해 덮어쓰기(upsert)** — 누적 아니라 스냅샷 갱신.
- **화면에서 셀 값을 바꿔도 다른 지표에는 자동 전파되지 않음** — override는 그 화면 국지 표시용 audit 로그.
- **전 지표에 영향을 주는 정정이 필요하면 MSSQL 원본을 고치는 것이 유일한 근본 경로**.

---

### 1. 표준 데이터 흐름

```
MSSQL 원본 (CRM · EICN · HappyTalk · 홈페이지 MariaDB 등)
   │
   │  각 도메인 배치가 03시(월별 소급은 1일 03:30)에 자기 규칙으로 aggregation
   ▼
Postgres 마트 테이블 (계산된 최종 숫자만 저장)
   │
   │  API SELECT (계산 없음, 조회만)
   ▼
프론트 화면 (렌더링만, 재계산 없음)
```

#### 계산 위치의 원칙

| 계층 | 하는 일 | 안 하는 일 |
|---|---|---|
| 배치 | 원본 read → aggregation → 마트 upsert | 화면 지향 포맷팅, override 판단 |
| 마트 | 결과 저장 (컬럼 단위 스칼라) | 다른 마트 참조, 파생 계산 |
| API | 마트 SELECT + override 얹기 + DTO 변환 | 원본 read, 지표 계산 |
| 프론트 | 렌더, 필터/정렬(클라 사이드) | 재집계, 원본 접근 |

---

### 2. 마트 테이블 ↔ 메뉴 매핑

#### 2-1. 대체로 1:1 (메뉴 하나 = 마트 하나)

| 마트 | 메뉴 |
|---|---|
| `mart_reservation_stats_system_daily` | 예약통계_시력교정 |
| `mart_reservation_stats_cataract_daily` | 예약통계_백내장 |
| `mart_reservation_monthly` | 예약 건수 |
| `mart_reservation_rate_monthly` | 예약률 |
| `mart_consultation_rate_monthly` | 전환율 |
| `mart_stop_reason_monthly` | 중단 사유 |
| `mart_procedure_exam_monthly` | 검사건수 |
| `mart_examination_monthly` | 시술별 |
| `mart_outpatient_count_monthly` | 외래수 |
| `mart_b2b_revenue_monthly` | B2B 매출 |
| `list_reservation` | 예약자 리스트 |
| `list_exam` | 검사자 리스트 |
| `list_cataract_exam` | 백내장 검사자 리스트 |
| `list_surgery` | 수술자 리스트 |
| `mart_list_reservation_homepage` | 예약자 리스트_홈페이지 (V21 · MariaDB 소스) |
| `mart_outpatient_list` | 외래수 리스트 (V25) |
| `mart_weekly_report` | 주차 레포트 (V28 · ISO 8601 주차) |
| `mart_exam_count_by_class` | 고객분류별 검사수 (V28) |

#### 2-2. 1:N (한 테이블 → 여러 화면)

| 마트 | 공유하는 메뉴 |
|---|---|
| `mart_reservation_overall_monthly` | 예약 종합 + 월간 레포트 (`online` 컬럼 동일 값) |
| `mart_surgery_monthly` | 수술 건수 + 주요 수술별 비중 + 수술별 비중 |

#### 2-3. 1:2 (한 도메인 → 월별 · 주별 두 테이블)

| 도메인 | 월별 마트 | 주별 마트 |
|---|---|---|
| 검사자 종합지표 | `mart_overall_exam_monthly` | `mart_overall_exam_weekly` |
| 수술 | `mart_surgery_monthly` | `mart_surgery_daily` |

#### 2-4. N:1 (한 화면 → 여러 마트 조합)

**월간 레포트** — 도메인 여러 개를 한 화면에 나열 (프론트에서 각 마트를 독립 조회 후 표/차트로 합침, 계산 아님):
- `mart_reservation_overall_monthly` (예약 종합)
- `mart_overall_exam_monthly` (검사자 종합)
- `mart_procedure_exam_monthly` (검사건수)
- `mart_surgery_monthly` (수술)
- `mart_consultation_rate_monthly` (전환율)
- `mart_reservation_rate_monthly` (예약률)

**예약통계_시력교정 / _백내장** — 원본 카운트 + 보정 이력 + 잠금 상태를 서비스에서 조합:
- `mart_reservation_stats_(system|cataract)_daily` (원본 CH 카운트)
- `reservation_stats_override` (셀 수기 보정 audit)
- `reservation_stats_period_lock` (월 확정 잠금)

#### 2-5. 아직 마트 없는 메뉴 (12개, `StatsPlaceholderPage` 표시)

`overseas` · `marketing` · `cancel-rate` · `no-show-rate` · `unit-price` · `staff-point` ·
`prp-rate` · `reoperation-rate` · `same-day-op` · `designated-doctor` · `visit-reason` ·
`daily-reception` · (`intake-conversion` 숨김)

> ✍️ **`dreamlens-revenue`(드림렌즈 장부)는 이 목록에서 빠졌다** — 마트가 없는 게 아니라
> **마트 대상이 아니다.** MSSQL 원천이 없고 사용자가 화면에서 직접 입력하는 데이터라
> `dreamlens_ledger` JPA 엔티티 + `/api/dreamlens-ledger` CRUD 로 구성돼 있다.
> 배치·마트를 태우지 말 것 (CLAUDE.md "직접 입력 장부" 예외 항목).

#### 2-6. 인프라 테이블 (메뉴 아님, 배치 지원용)

- `batch_run_log` — 배치 실행 이력 · 실패 원인 추적
- `batch_watermark` — 도메인별 마지막 배치 위치
- `reservation_stats_period_lock` — 월 확정 잠금 (배치 덮어쓰기 방어)
- `reservation_stats_override` — 예약통계 셀 수기 보정 (INSERT-only audit)

---

### 3. 배치가 마트에 쓰는 방식

#### 3-1. 집계형 마트 (`mart_*`)

- 방식: `INSERT ... ON CONFLICT (yr, mo) DO UPDATE`
- 특성:
  - 매 실행마다 대상 월 전체를 원본에서 다시 COUNT/SUM → **값을 덮어쓰기** (누적 아님)
  - 소급 취소/보정도 다음 배치에서 자동 반영
  - 배치를 여러 번 돌려도 결과 동일 (멱등)

#### 3-2. 리스트형 마트 (`list_*`)

- 방식: 대상 기간 `DELETE` → 그 기간 `INSERT`
- 특성:
  - 취소·삭제된 원본 행도 마트에서 자연 제거
  - PK 없이 원본 행 그대로 복제 (40+ 컬럼)

#### 3-3. 잠금 (period_lock)

- 확정된 월(`reservation_stats_period_lock`에 등재된 `product_type, period`)은 배치가 자동으로 스킵
- 목적: 확정된 과거 월(예: 2024·2025 seed)이 배치 재계산으로 오염되지 않도록 방어
- 잠금은 마이그레이션 seed 스크립트에서 심음 (`V19__..._system_2026_h1_seed.sql`, `V20__..._cataract_2026_h1_seed.sql`)

#### 3-4. min-year 가드

- `ReservationMartJob` 등은 기본 `minYear=2026`을 두고 그 미만 월을 무시
- 이유: 2024·2025는 원본 정의가 바뀌어 라이브 계산과 값이 달라짐 → V12 seed의 확정값을 SSOT로 고정
- 수동 재적재 API(`runManual`)로 우회 가능

---

### 4. 값을 바꾸고 싶을 때 어디를 손대야 하나

#### 4-1. 원인별 정정 경로

| 원인 | 정정 경로 | 전파 범위 |
|---|---|---|
| 원본 데이터가 잘못 입력됨 (콜센터 오등록 등) | CRM 담당자에게 요청 → MSSQL 정정 → 다음 배치 자동 반영 | 전 지표 |
| 원본은 맞는데 이 화면 집계 정의에 특이 케이스 | 예약통계 화면에서 셀 수기 보정 (`reservation_stats_override`) | 그 화면만 |
| 특정 월 확정 후 배치 덮어쓰기 방지 | `reservation_stats_period_lock` 에 등재 | 배치 skip |
| 특정 기간을 강제 재계산 (소급 반영) | `POST /api/admin/batch/rerun?from&to&domain=...` | 지정 도메인 마트만 |

#### 4-2. Override의 스코프 — 왜 자동 전파를 안 하는가

**의도적 설계**:
- `reservation_stats_override`는 "예약통계 이 셀만 특별한 이유로 다르게 표시" 용도
- 다른 도메인 마트(예약 종합·전환율 등)로 자동 전파하지 않음
- 근거: 도메인마다 집계 정의가 달라서 셀 1개의 의미가 다른 마트에서 1:1로 매핑되지 않음
  - 예: 예약통계 "TM_예약 +1" ≠ 예약 종합 "온라인 +1" (필터·경로 다름)
- Trade-off: **화면 간 불일치는 감수** ↔ **원본 정합성·이력 추적성 확보**

#### 4-3. "화면에서 바꾼 걸 모든 지표에 반영"이 필요할 때

원본 수정이 유일한 근본 경로. 순서:
1. CRM 담당자에게 원본 정정 요청 → MSSQL 반영
2. 필요 시 관리자 API 로 해당 월 재적재 (`/api/admin/batch/rerun`)
3. 다음 03시 배치로 자동 갱신 (일반적 경우)

---

### 5. 프론트에서 계산이 있는 극소수 예외

원칙은 "프론트 = 렌더만"이지만 몇 가지 파생 계산은 존재:

1. **비율** — `달성률 = 실적/목표` 같은 A/B 형태는 프론트에서 나눗셈. 원료 A·B는 마트 그대로.
2. **주간 슬라이싱 SQL VIEW** — 월별 마트를 주별로 재슬라이싱하는 뷰가 일부 (SQL 안의 재계산이지 코드 계산은 아님).
3. **월간 레포트 종합 표** — 여러 마트 조회 결과를 프론트에서 표로 붙여 표시 (합산·나눗셈 없음, 배치 결과 그대로 나열).

---

### 6. 새 메뉴를 추가할 때 따라야 할 표준

1. **마트 테이블 신설**: `sql/mart/V##__<domain>_mart.sql`
2. **MartSchemaInitializer 등록**: 신규 V## 스크립트 apply
3. **배치 잡 신설**: `batch/job/<Domain>MartJob.java` + Writer
4. **원본 SQL**: `sql/<domain>/`, 마트 SQL: `sql/mart/upsert-*.sql` / `delete-*-range.sql` + `insert-*.sql`
5. **BatchOrchestrator 배선**: `runDaily`·`runMonthlyReconcile` 에 도메인 추가
6. **앱 조회 경로**: `<Domain>MartRepository` (@Primary in postgres-mart) + Service + Controller
7. **잠금/워터마크**: 필요 시 `reservation_stats_period_lock` 유사 패턴 참고
8. **화면 등록**: `statsPages.ts` + `navigation.ts` + `pages/<domain>/routes.ts`

패턴 참고: 예약통계_시력교정(V11 mart + V19 seed + `ReservationStatsDailyMartJob`).

---

### 7. FAQ

**Q. 예약통계_시력교정에서 셀을 바꿨는데 월간 레포트 값이 안 바뀌었어요.**
A. 정상. Override는 그 화면 국지적. 전 지표 반영이 필요하면 MSSQL 원본을 정정 후 재적재.

**Q. 마트끼리 값이 다른데 버그 아닌가요?**
A. 대개 정의 차이. 예약통계의 "예약수"와 예약 종합의 "온라인 예약수"는 필터·경로가 다름. 각 도메인의 정의 문서 확인.

**Q. 배치를 두 번 돌려도 안전한가요?**
A. 안전. 집계형은 upsert, 리스트형은 delete+insert. 멱등.

**Q. 어제 원본 데이터가 바뀌면 오늘 몇 시부터 반영되나요?**
A. 새벽 03시 배치 이후. 인트라데이 재실행이 걸려있는 도메인(예약통계)은 오전 10시에도 D-1 재실행.

**Q. 2024·2025 값을 바꾸고 싶어요.**
A. 기본은 잠금 상태(V12 seed + min-year 가드). 정말 바꿔야 하면 관리자 API `/api/admin/batch/rerun` 으로 우회하거나 seed SQL을 수정 후 재적재.

---

---

## 12. 배치 실행 규칙과 마트별 정책

> 구 `batch-execution-rules.md`(2026-07-16)를 흡수했다.
> **지금 배치가 실제로 어떻게 도는지**(스케줄·write 정책·수동 실행 동작·min-year 가드)가 여기 있다.
> 위 §1~§10 이 설계 근거라면, 이 절은 운영 규칙이다.


---

### 0. 요약

- **원본(MSSQL·MariaDB) → 매일 03:00 배치 → Postgres 마트 → 앱 조회** 구조.
- **모든 배치는 idempotent** — 재실행해도 중복 행 안 생김. 두 패턴:
  - **UPSERT** (월별 집계) — `ON CONFLICT DO UPDATE`
  - **DELETE + INSERT** (리스트) — 범위 delete 후 재삽입
- **`min-year=2026` 가드**로 24·25 확정값(시드) 을 배치가 실수로 덮지 못하게 방어. **자동·수동 모두 적용** (예외: `stop-reason`·`b2b-revenue` 는 필터 없음).
- **관리자 수동 실행** (`runManual`) 은 `runDaily` 의 top-level 스킵만 우회 — 24·25 재계산은 대부분 시드 SQL 직접 수정이 유일한 경로.
- **트랜잭션은 도메인 단위 all-or-nothing** — 도메인 안 한 개 잡이 실패하면 그 도메인 전체 롤백.

---

### 1. 모든 배치의 공통 조건

#### 1-1. 활성화 조건

| 조건 | 값 |
|---|---|
| Spring 프로파일 | `postgres-mart` (local/dev/prod 프로파일 그룹이 자동 포함) |
| `batch.mart.enabled` | `true` (`false` 이면 스케줄러·수동 실행 모두 skip) |

#### 1-2. 스케줄 (`BatchOrchestrator`)

| 시각 (Asia/Seoul) | 유형 | 범위 | 대상 |
|---|---|---|---|
| **매일 03:00** | `DAILY` | D-1 (어제) | 전 도메인 |
| **매일 10:00** | `DAILY` (intraday) | D-1 | 예약통계 일별 마트만 재실행 (콜센터 늦반영 흡수) |
| **매월 1일 03:30** | `MONTHLY_RECONCILE` | 전월 전체 | 전 도메인 (현재 비활성 — cron `-`) |
| **관리자 수동** | `MANUAL` | 지정 범위 | 전 도메인 or 지정 도메인 |

#### 1-3. 안전장치

**(a) `min-year=2026` 가드** — 24·25 는 seed 파일로 마트에 확정 저장되어 있고, 배치가 이 연도에 대해 write 자체를 시도하지 않는다. 시드 값 훼손 방지.
- 각 잡 내부에 `.filter(m -> m.getYear() >= minYear)` 필터가 있어 **자동·수동 관계없이** 24·25 는 upsert 대상에서 걸러진다.
- `runDaily` 의 **top-level 연도 스킵**(어제 연도가 24·25 면 배치 자체 중단)은 `runManual` 이 우회하지만, 잡 내부 필터는 그대로 적용됨 → 결과적으로 24·25 write 는 대부분 막힌다.
- **예외 2개**: `mart_stop_reason_monthly` (24·25 시드가 없어 min-year 필터 미적용, 코드 주석에 명시) · `mart_b2b_revenue_monthly` (필터 자체 없음). 이 둘은 수동 실행 시 24·25 도 덮어씀.

**(b) 트랜잭션 · 도메인 단위 all-or-nothing** — 각 `*MartJob.run(from, to)` 이 `@Transactional`. 잡 안의 여러 write 중 하나라도 실패하면 전체 롤백 (Postgres write 만 대상 — MSSQL·MariaDB read 는 별도 datasource 로 트랜잭션 무관).

**(c) 도메인 간 순차 실행** — `BatchOrchestrator.runDomains` 에서 SURGERY → RESERVATION → EXAM → CONSULTATION → OUTPATIENT → OVERALL → ETC 순. 하나가 예외 던지면 뒤 도메인은 실행 안 됨.

**(d) 원본 시스템 미접근 (앱 조회 시)** — 컨트롤러는 오직 Postgres 마트만 조회. 원본(MSSQL·MariaDB) 은 배치 시점에만 접근.

#### 1-4. 관측

- **`batch_run_log`** — 매 실행마다 새 행 (`RUNNING → SUCCESS/FAILED`, `table_stats` JSON 에 각 마트별 upsert 행 수).
- **`batch_watermark`** — 도메인별 마지막 성공 적재일 (다음 daily 배치의 시작점).
- **Slack 알림** — 실패 시 스택 요약 자동 전송 (`LOGGING_SLACK_*` 프로파일별 활성).

#### 1-5. 재실행 안전 (idempotent)

모든 마트가 두 패턴 중 하나를 씀:

**패턴 A. UPSERT (`ON CONFLICT DO UPDATE`)** — 월별 집계 마트.
```sql
INSERT INTO mart_*_monthly (yr, mo, ...) VALUES (:yr, :mo, ...)
ON CONFLICT (yr, mo) DO UPDATE SET ...
```
- 같은 (yr, mo) 재실행 → 값 덮어씀. 새 행 생성 없음.
- 마트에만 있고 소스에 없는 (yr, mo) 는 남음 (배치가 삭제하지 않음).

**패턴 B. DELETE + INSERT** — 리스트 마트.
```sql
DELETE FROM list_* WHERE registered_at BETWEEN :from AND :to;
INSERT INTO list_* (...) VALUES (...);
```
- 같은 범위 재실행 → 범위 안 데이터 완전 대체.
- 소스에서 삭제·수정된 개별 행이 마트에 자연스레 반영됨.
- 삭제 범위와 삽입 범위(반개구간 등) 가 어긋나지 않도록 계약 테스트가 지킴.

---

### 2. 마트별 정책 (도메인 순)

#### 2-1. RESERVATION 도메인

실행 순서: `ReservationListHomepageMartJob` → `ReservationMartJob` → `ReservationStatsDailyMartJob`

| 마트 | 잡 | 패턴 | 소스 | min-year | 특수 조건 |
|---|---|---|---|---|---|
| `mart_list_reservation_homepage` | ReservationListHomepageMartJob | DELETE+INSERT (reg_date) | MariaDB `TBL_COUNSEL` (SSH 터널 경유) | 없음 | 홈페이지 소스 URL 미설정 시 skip. **다른 잡보다 먼저 실행** — 종합 계산이 이 마트를 읽기 때문 |
| `mart_reservation_monthly` | ReservationMartJob | UPSERT (yr, mo) | MSSQL | ✅ 적용 | 24·25 는 V9/V12 시드 보호 |
| `mart_reservation_overall_monthly` | ReservationMartJob | UPSERT (yr, mo) | MSSQL + 홈페이지 마트 | ✅ 적용 | 24·25 는 V12 시드 · 2026-01~05 는 V24 골든 시드(담당자 확정값, 배치 write 차단) · 2026-06~ 는 네이버+카카오+홈페이지(리스트 화면과 동일한 raw) 공식으로 라이브 SUM(오버라이드 즉시 반영) · 현재 진행 중인 달은 부분값 노출 |
| `list_reservation` | ReservationMartJob | DELETE+INSERT (registered_at) | MSSQL | 없음 | 취소·수정건 자동 흡수 |
| `mart_reservation_stats_system_daily` | ReservationStatsDailyMartJob | UPSERT (stat_date) | MSSQL | ✅ 적용 | **2026-H1 (1~6월) V19 시드 + period_lock** — 배치가 이 6개월 안 덮음 |
| `mart_reservation_stats_cataract_daily` | ReservationStatsDailyMartJob | UPSERT (stat_date) | MSSQL | ✅ 적용 | **2026-H1 V20 시드 + period_lock** |

#### 2-2. SURGERY 도메인 (`SurgeryMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_surgery_daily` | UPSERT (stat_date) | 없음 | 각 날짜 개별 upsert |
| `mart_surgery_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V15 시드 |
| `list_surgery` | DELETE+INSERT | 없음 | 취소·수정 흡수 |

#### 2-3. EXAM 도메인 (`ExamMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_examination_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V9·V16 시드 |
| `mart_procedure_exam_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V9 시드 |
| `list_exam` | DELETE+INSERT (exam_date) | 없음 | |
| `list_cataract_exam` | DELETE+INSERT (exam_date) | 없음 | Cataract_Exam 스냅샷 특성상 과거월 소급 변동 가능 |

> ⚠️ **`list_cataract_exam` 수동 재적재는 반드시 월 단위로 나눠서** (`/api/admin/batch/rerun?...&domain=EXAM`).
> 검사일 = "요청 범위 내 첫 H 예약일"이라, 여러 달을 한 범위로 돌리면 월 경계를 넘는 재방문자의
> 뒷달 행이 앞달로 흡수돼 `리스트 건수 = 월별 백내장 검사수` 정합이 깨진다
> (실사례 2026-07-30: 05~07월 한 번에 돌리자 6월 55 → 54). 일 단위 야간 크론은 창이 작아 무관.

#### 2-3-1. REPORT 도메인 (`ReportMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_weekly_report` | UPSERT (yr, wk) | 없음 | ISO 8601 연간 주차. 1주차가 전년 12월을 물어도 주차연도로 귀속 |
| `mart_exam_count_by_class` | UPSERT (yr, mo, motive_report) | 없음 | 내원동기(레포트) 9계열 |

> 💡 **이 도메인은 화면의 MSSQL 의존을 끊기 위해 만들었다.** 주차 레포트(`/api/report/weekly`)와
> 고객분류별 검사수(`/api/stats/exam-count/by-class`)가 종전에는 MSSQL 직결이라 SSH 터널·VPN 이
> 끊기면 그 화면만 503 이었다. 이제 배치가 적재하고 화면은 마트를 읽는다
> (`WeeklyReportMartQueryService`·`ExamCountMartQueryService` 가 `@Primary`).
>
> 골든 시드 구간이 없어 min-year 가드를 두지 않는다 — 주차 값은 전 구간 라이브이고(월 단위 레거시
> 확정값은 주로 쪼갤 수 없다), 고객분류는 24·25 에 존재하지 않던 분류다.
>
> 수동 재적재: `POST /api/admin/batch/rerun?from=2026-01-01&to=2026-12-31&domain=REPORT`

#### 2-4. CONSULTATION 도메인 (`ConsultationMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_consultation_rate_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V18 시드 |
| `mart_stop_reason_monthly` | UPSERT (yr, mo) | **적용 안 함** | 24·25 시드 없음. 배치가 전 연도 덮어씀 — 24·25 값을 고치려면 소스 SQL 수정 후 재실행 |
| `mart_reservation_rate_monthly` (vision) | UPSERT (yr, mo, category) | ✅ 적용 | 24·25 는 V13 시드 |
| `mart_reservation_rate_monthly` (cataract) | UPSERT (yr, mo, category) | ✅ 적용 | 24·25 는 V13 시드 |

#### 2-5. OUTPATIENT 도메인 (`OutpatientMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_outpatient_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 시드 값 |

#### 2-6. OVERALL 도메인 (`OverallMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_overall_exam_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V14 시드 · 현재 달은 `partial=true` 플래그로 노출 |
| `mart_overall_exam_weekly` | UPSERT (yr, iso_week) | ✅ 적용 | 주 단위 지표 |

#### 2-7. ETC 도메인 (`EtcMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_b2b_revenue_monthly` | UPSERT (yr, mo) | **적용 안 함** | B2B 매출. min-year 필터 없음 — 24·25 도 수동 배치로 덮어씀 |

---

### 3. 수동 배치 (Admin API)

#### 3-1. 엔드포인트

```bash
POST /api/admin/batch/rerun?from=YYYY-MM-DD&to=YYYY-MM-DD&domain=ALL|SURGERY|RESERVATION|EXAM|CONSULTATION|OUTPATIENT|OVERALL|ETC
Authorization: Bearer <JWT>
```

`domain` 미지정 or `ALL` → 전 도메인 순차 실행.

#### 3-2. 자동 배치와의 차이

| 항목 | 자동 (DAILY/MONTHLY_RECONCILE) | 수동 (MANUAL) |
|---|---|---|
| `runDaily` top-level 연도 스킵 (D-1 이 24·25 면 배치 자체 중단) | 적용 | 우회 (실행 자체는 진행됨) |
| 각 잡 내부 `min-year` 필터 (24·25 upsert 차단) | 적용 | **적용 — 수동도 못 덮음** (stop-reason, b2b-revenue 제외) |
| 실행 범위 | D-1 (daily) 또는 전월 (reconcile) | 지정 범위 자유 |
| `batch_run_log.run_type` | `DAILY` / `MONTHLY_RECONCILE` | `MANUAL` |
| period_lock (V19/V20 예약통계 2026-H1) | 존중 | 존중 (수동도 못 덮음) |

**정리**: `runManual` 은 실행을 트리거하지만, 각 잡 안에서 24·25 는 여전히 필터로 걸러진다. 24·25 를 재계산하고 싶다면 대부분의 마트는 시드 SQL(V9·V13·V14·V15·V16·V18) 을 직접 수정해야 함.

#### 3-3. 수동 실행 시 동작 요약

**시나리오 A. 이번 달(현재 진행 중) 재적재**
```bash
POST /rerun?from=2026-07-01&to=2026-07-16&domain=RESERVATION
```
- 모든 마트가 7월 범위 upsert/replace
- 리스트 마트: 7월 1~16일 delete + insert (17~31일 데이터는 있으면 유지됨)
- 월별 마트: 7월 (yr=2026, mo=7) upsert 하나
- `list_reservation`·`mart_list_reservation_homepage` 은 delete 범위와 insert 데이터 범위가 같아 완전 정합

**시나리오 B. 지난 달 완월 재계산**
```bash
POST /rerun?from=2026-06-01&to=2026-06-30&domain=RESERVATION
```
- 6월 전체 재계산 · 재적재
- 24·25 시드는 min-year 가드가 여전히 보호 (수동이라도 2026 이상 범위면 우회 이슈 없음)

**시나리오 C. 24·25 재계산 시도**
```bash
POST /rerun?from=2025-01-01&to=2025-12-31&domain=SURGERY
```
- 배치는 실행되지만 **`SurgeryMartJob` 내부 min-year 필터가 2025 를 걸러내 아무것도 upsert 되지 않음** (V15 시드 값 그대로 유지)
- 이 시나리오는 **대부분의 마트에서 무동작** — 24·25 시드가 유일 원천
- 예외:
  - `mart_stop_reason_monthly` — 필터 없음. 24·25 값이 실제로 배치 재계산 결과로 덮어써짐 (의도됨)
  - `mart_b2b_revenue_monthly` — 필터 없음. 24·25 값이 덮어써짐
- 24·25 값을 정정하려면 대부분 마트는 **시드 파일 SQL 직접 UPDATE 후 재적재** (V9/V13/V14/V15/V16/V18)
- period_lock (V19/V20) 예약통계 2026-H1 마트는 수동도 못 덮음 (별도 잠금 해제 절차)

**시나리오 D. 여러 달 걸친 범위**
```bash
POST /rerun?from=2026-01-01&to=2026-07-31&domain=RESERVATION
```
- 각 마트가 범위에 걸친 월 전부 upsert/replace
- 월별 마트: 1월~7월 각각 upsert
- 리스트 마트: 1월 1일 ~ 7월 31일 delete + insert (기간이 길수록 소스 쿼리·write 부담 증가)

**시나리오 E. 도메인 부분 실행**
```bash
POST /rerun?from=2026-07-01&to=2026-07-16&domain=CONSULTATION
```
- 지정 도메인만 실행. 나머지 도메인 마트는 그대로.

#### 3-4. 실패 시

- 도메인 안 한 잡이라도 예외 던지면 그 도메인 전체 롤백 → 그 도메인의 어떤 마트도 이번 실행분 반영 안 됨.
- `batch_run_log.status = FAILED`, `error_message` 에 예외 요약.
- Slack 알림 발송.
- 뒤 도메인은 실행 안 됨 (RESERVATION 이 실패하면 EXAM 이후 안 돎).

#### 3-5. 재실행 언제 안전한가

- 언제든 안전 — idempotent 설계.
- 다만 실행 중 재실행하면 락 대기·부하 이슈 있을 수 있음. `batch_run_log` 로 진행 상태 확인 후 실행 권장.

---

### 4. 특수 마트 상세

#### 4-1. `mart_reservation_stats_system_daily` · `mart_reservation_stats_cataract_daily` (V19/V20 period_lock)

- **2026-01 ~ 2026-06 은 seed 값 (엑셀 원본)** 이며 `reservation_stats_period_lock` 테이블로 잠금.
- 배치가 이 6개월 범위에 대해 upsert 시 lock 체크 → 스킵.
- 수동 실행도 이 잠금을 존중 — 잠금을 해제하려면 `reservation_stats_period_lock` 에서 해당 period 를 삭제해야 함 (설계상 의도된 절차).

#### 4-2. `mart_list_reservation_homepage` (신규 · MariaDB 소스)

- 유일하게 **MariaDB 소스** (다른 마트는 MSSQL).
- SSH 터널 사이드카 없이 analytics 컨테이너 내부에서 sshpass 로 터널 오픈 (`docker/entrypoint.sh`).
- 소스 미설정(`homepage.datasource.url` 없음) 시 배치 잡이 skip 하고 다른 잡은 계속.
- 배치 순서상 **가장 먼저 실행** — `ReservationOverallStatsService` 가 종합 계산에서 이 마트를 읽기 때문.
- 상세 배경: [`legacy-homepage-source-strategy.md`](./legacy-homepage-source-strategy.md)

#### 4-3. `mart_reservation_overall_monthly` (온라인 예약 공식 · coverageMonth)

- **2026-06 부터 온라인 = 네이버 + 카카오톡 + 홈페이지(리스트 화면과 동일한 raw · 전 진료 · `COUNT(*)`)** — 그 이전은 마트 시드(24·25 V12, 2026-01~05 V24) 그대로.
- **2026-06+ 조회는 마트 대신 라이브 SUM** — 예약통계_시력교정·백내장 셀 오버라이드가 예약 종합·월간 레포트에 즉시 반영되도록 매 요청마다 시력교정 마트 + 백내장 마트 + 홈페이지 마트에서 SUM. 배치가 채운 마트 값은 폴백용으로만 남음.
- **2026-01~05 는 V24 골든 시드로 고정** (2026-07-24) — 담당자 확정값 못 박음. `ReservationMartJob` 이 이 5개월은 write 대상에서 제외.
- `coverageMonth` 로직으로 홈페이지 커버리지 판정:
  - **과거 달**: 홈페이지 마지막 등록일이 그 달 말일이 아니면 미커버로 판정 → null
  - **현재 진행 중인 달**: 부분값이라도 노출 (2026-07 부터 정책 완화, 커밋 `ceca8a0`)
- 프론트에서 부분값을 완월값으로 오해할 여지 있음 — 향후 `partial` 플래그 노출 검토 필요.

---

### 5. 자주 묻는 질문

**Q. 같은 날 같은 범위로 배치 두 번 돌리면?**
A. 안전. Idempotent 라 마트 상태 동일 (UPSERT 는 같은 값 덮어씀, DELETE+INSERT 는 같은 데이터 재삽입). `batch_run_log` 만 두 행 남음.

**Q. 배치가 중간에 실패하면 부분 반영?**
A. 아니오. 도메인 단위 트랜잭션이라 실패한 도메인의 마트는 전부 롤백. 앞선 도메인의 성공분은 이미 커밋된 상태로 남음.

**Q. 24·25 값을 재계산하려면?**
A. 대부분 마트는 `runManual` 만으로 재계산 안 됨 — 각 잡 내부 min-year 필터가 여전히 24·25 를 걸러냄. 시드 파일(V9/V13/V14/V15/V16/V18) SQL 직접 수정 후 재적용이 유일한 경로.
예외 2개는 `runManual` 으로 재계산 됨:
- `mart_stop_reason_monthly` — 필터 없음
- `mart_b2b_revenue_monthly` — 필터 없음
period_lock (V19/V20 예약통계 2026-H1) 은 별도 잠금 해제 필요.

**Q. 특정 마트만 재적재하려면?**
A. 현재는 도메인 단위 API 만 있음. 도메인 안 여러 마트가 함께 재실행됨. 특정 마트만 원한다면 별도 admin endpoint 추가 필요.

**Q. 원본에 없는 옛 데이터가 마트에 남는 이유?**
A. UPSERT 는 삭제하지 않음. 마트에서 완전 정합이 필요하면 해당 (yr, mo) 를 SQL 로 직접 삭제 후 재배치.

**Q. 스케줄러가 안 도는 것 같으면?**
A. `batch.mart.enabled=false` 이거나 cron `-` 인지 확인. `application-{profile}.yml` 참조.

---

## 13. 참고

### 코드 자산

- 마트 마이그레이션 스크립트: `backend/src/main/resources/sql/mart/V{1..32}__*.sql` (`MartSchemaInitializer` 가 실행)
- 마트 upsert/select/delete SQL: `backend/src/main/resources/sql/mart/*.sql`
- 도메인별 원본 SQL(직결 시절): `backend/src/main/resources/sql/{domain}/*.sql`
- 배치 컴포넌트: `backend/src/main/java/com/bviit/analytics/batch/`
- 통합테스트: `backend/src/test/java/com/bviit/analytics/batch/job/*MartWriterIT.java` (Testcontainers Postgres)

### 참조 문서

- 배치 실행 규칙·마트별 정책: **이 문서 §12** · 마트 ↔ 메뉴 매핑: **이 문서 §11**
- 홈페이지 소스 전략: [`legacy-homepage-source-strategy.md`](./legacy-homepage-source-strategy.md)
- DB 테이블 문서(CRM MSSQL 스키마): [`../db/tables/`](../db/tables/)
- 프로젝트 표준·컨벤션: `CLAUDE.md`, `AGENTS.md`

### 관련 프로파일

| 프로파일 | 조회 소스 | 배치 실행 |
|---------|---------|---------|
| `local` | H2/Postgres | ❌ 비활성 |
| `dev` | Postgres | 선택 |
| `mssql` | MSSQL 직결 | ❌ (Cutover 이전 폴백용) |
| `postgres-mart` | Postgres 마트 | ✅ (`@Scheduled` 활성) |
| `prod` | `postgres-mart` 포함 | ✅ |
