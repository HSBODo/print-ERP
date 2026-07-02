# 데이터 배치 & 마트 전환 전략

> 작성일: 2026-07-02
> 상태: **초안(합의 완료, 착수 전)**
> 목적: CRM MSSQL 직결 조회 구조를 **Postgres 마트(Mart) 기반**으로 전환하기 위한 설계·마이그레이션 계획

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

| # | 항목 | 결정 |
|---|------|------|
| 1 | 재적재 범위 | **매일 어제(D-1) 하루치만 append** (최경량 방식) |
| 2 | 리스트 실시간성 | **불필요** — 리스트도 T-1 마트로 통합 |
| 3 | PII 처리 | **CRM 원본 그대로 복제** (익명화·마스킹 없음) |
| 4 | Cutover 방식 | **페이지별 `@Profile` 전환** (안전, 롤백 쉬움) |
| 5 | 스냅샷 스토어 | **마트로 흡수 후 삭제** (`SurgerySnapshotStore` 등) |
| 6 | 배치 러너 | **Spring `@Scheduled`** (Airflow는 이번 스코프 밖) |

### 결정 1의 함의 및 완화책 — ⚠️ 중요

**"어제 하루치만 append"의 리스크**: CRM에서 과거 데이터가 소급 수정(수술코드 정정, 취소 처리 등)돼도 마트에는 반영되지 않는다.

**완화책 (필수 구현)**:
- **관리자 수동 재적재 API**: 특정 날짜 범위를 재계산해 덮어쓰는 엔드포인트 제공 (`POST /api/admin/batch/rerun?from=YYYY-MM-DD&to=YYYY-MM-DD&domain=surgery`)
- **월말 자동 재적재 잡**: 매월 1일 03:30, **전월 전체를 재계산**하여 소급 수정분 흡수 (append가 아닌 **upsert**)
- **집계 마트는 upsert, 리스트는 delete+insert**: 리스트는 취소·수정 감지 어려우므로 해당 날짜 범위 삭제 후 재삽입

---

## 3. 데이터소스 구성

### Spring Datasource 설계

```
@Configuration
public class DataSourceConfig {

    @Primary
    @Bean("postgresDataSource")           // 운영: 모든 API 조회
    @ConfigurationProperties("spring.datasource.postgres")
    public DataSource postgresDataSource() { ... }

    @Bean("mssqlDataSource")               // 배치 전용
    @ConfigurationProperties("spring.datasource.mssql")
    public DataSource mssqlDataSource() { ... }
}
```

- `@Primary`는 Postgres — JPA/JdbcTemplate 기본 주입 대상
- MSSQL 접근은 배치 컴포넌트만 `@Qualifier("mssqlDataSource")`로 명시 주입
- 프로파일: `mssql` 프로파일 유지(배치용), 신규 `postgres-mart` 프로파일 추가 (조회용)

### application-*.properties

```
# application.properties (개발 H2 기본, 변경 없음)

# application-postgres-mart.properties (신규, 운영 조회용)
spring.datasource.postgres.url=jdbc:postgresql://...
spring.datasource.mssql.url=jdbc:sqlserver://...  # 배치 전용
batch.mart.enabled=true
batch.mart.schedule.cron=0 0 3 * * *              # 매일 03:00
batch.mart.monthly-reconcile.cron=0 30 3 1 * *    # 매월 1일 03:30 전월 재계산
```

---

## 4. 마트 스키마 카탈로그

### 4.1 집계 마트 (aggregate)

| 마트 테이블 | 소스 SQL (현재) | PK | 페이지 |
|-----------|--------------|-----|-------|
| `mart_surgery_monthly` | vision/cataract/reop `*-monthly.sql` | (yr, mo) | surgery |
| `mart_surgery_daily` | vision/cataract/reop `*-daily.sql` | (dt) | surgery |
| `mart_surgery_ratio_monthly` | surgery/ratio | (yr, mo) | surgery-ratio |
| `mart_surgery_composition_monthly` | surgery/composition | (yr, mo, category) | surgery-composition |
| `mart_reservation_kpi` | reservation/kpi | (yr, mo) | reservation |
| `mart_reservation_trend` | reservation/trend | (yr, mo, channel) | reservation |
| `mart_reservation_composition` | reservation/composition | (yr, mo, path) | reservation |
| `mart_reservation_overall_monthly` | reservation/overall | (yr, mo, tab) | reservation-overall |
| `mart_exam_monthly` | exam SQL | (yr, mo, type) | examination |
| `mart_procedure_exam_monthly` | procedure-exam SQL | (yr, mo) | procedure-exam |
| `mart_consultation_rate_monthly` | consultation-rate SQL | (yr, mo, category) | consultation-rate |
| `mart_cataract_reservation_rate_monthly` | cataract-reservation-rate SQL | (yr, mo) | cataract-reservation-rate |
| `mart_stop_reason_monthly` | stop-reason SQL | (yr, mo, reason) | stop-reason |
| `mart_outpatient_count_daily` | outpatient SQL | (dt) | outpatient-count |
| `mart_overall_exam_weekly` | overall/weekly SQL | (yr, week_no) | overall-exam-weekly |
| `mart_overall_exam_monthly` | overall SQL | (yr, mo) | overall-exam |
| `mart_b2b_revenue_monthly` | etc/b2b SQL | (yr, mo) | b2b-revenue |

### 4.2 리스트 마트 (list)

| 마트 테이블 | 소스 SQL | PK | 파티션 |
|-----------|--------|-----|--------|
| `list_surgery` | surgery/find-surgery-list.sql | (cust_num, surgery_date, category) | RANGE(surgery_date) 월별 |
| `list_exam` | exam/find-exam-list.sql | (cust_num, exam_date, seq) | RANGE(exam_date) 월별 |
| `list_cataract_exam` | exam/find-cataract-exam-list.sql | (cust_num, exam_date, seq) | RANGE(exam_date) 월별 |
| `list_reservation` | reservation/find-reservation-list.sql | (reserve_num) | RANGE(reserve_date) 월별 |

- 파티셔닝: 최초에는 `pg_partman` 없이 **수동 `PARTITION BY RANGE`** 로 시작. 배치가 새 월 파티션 자동 생성.
- 인덱스: `(surgery_date)`, `(cust_num)`, `(surgery_category)` 기본. 필터 컬럼은 페이지 요구에 따라 추가.

### 4.3 메타 테이블

| 테이블 | 목적 |
|-------|------|
| `batch_run_log` | 배치 실행 이력 (job_name, run_date, status, rows_upserted, duration_ms, error) |
| `batch_watermark` | 마트별 마지막 성공 적재 날짜 (D-1 append 판정 기준) |

---

## 5. 배치 아키텍처

### 5.1 컴포넌트 구성

```
com.bviit.analytics.batch/
├── BatchOrchestrator            // @Scheduled 진입점
├── BatchRunLogRepository        // 실행 이력 저장
├── WatermarkRepository          // 마트별 마지막 적재일 관리
├── job/
│   ├── SurgeryDailyMartJob      // mart_surgery_daily append
│   ├── SurgeryMonthlyMartJob    // mart_surgery_monthly upsert (당월만)
│   ├── SurgeryListMartJob       // list_surgery delete+insert (D-1 하루)
│   ├── ReservationMartJob
│   ├── ExamMartJob
│   ├── ...
│   └── MonthlyReconcileJob      // 매월 1일 전월 전체 재계산
└── admin/
    └── BatchAdminController     // POST /api/admin/batch/rerun
```

### 5.2 각 잡의 트랜잭션 경계

1. MSSQL에서 D-1 데이터 조회 (`repository.findVisionDailyByType("2026-07-01", "2026-07-01")`)
2. Postgres 트랜잭션 시작
3. 리스트: 해당 날짜 범위 `DELETE` → `INSERT`
4. 집계: `INSERT ... ON CONFLICT (yr, mo) DO UPDATE` (upsert)
5. `batch_watermark` 업데이트
6. `batch_run_log` 성공 기록
7. 커밋

**실패 시**: 롤백 후 `batch_run_log`에 에러 기록, Slack/이메일 알림 (별도 스코프).

### 5.3 스케줄

| 잡 | 주기 | 처리 범위 |
|----|-----|---------|
| Daily append | 매일 03:00 | D-1 하루 |
| Monthly reconcile | 매월 1일 03:30 | 전월 전체 재계산 |
| Admin rerun | 수동 | 지정 범위 |

---

## 6. Cutover 전략 (페이지별 전환)

### 6.1 원칙

- **레포지토리 레벨에서 스위치**: 서비스는 인터페이스 유지, 두 구현(`*MssqlRepository`, `*MartRepository`)을 프로파일로 주입
- **한 페이지씩 이행** — 마트 채워지고 검증 완료 후 조회 스위치
- **롤백 용이**: 프로파일 원복하면 즉시 MSSQL 직결로 복귀

### 6.2 도메인별 인터페이스 예시

```
public interface SurgeryStatsRepository { ... }

@Repository @Profile("mssql")
class SurgeryStatsMssqlRepository implements SurgeryStatsRepository { ... }  // 기존

@Repository @Profile("postgres-mart")
class SurgeryStatsMartRepository implements SurgeryStatsRepository { ... }   // 신규
```

### 6.3 페이지 전환 순서 (제안)

가장 부하 크고 이득 큰 페이지부터:

1. **Phase 1** — 수술(surgery, surgery-ratio, surgery-composition, surgery-list)
2. **Phase 2** — 예약(reservation, reservation-overall, reservation-list)
3. **Phase 3** — 검사(examination, procedure-exam, exam-list, cataract-exam-list)
4. **Phase 4** — 전환·성공률(consultation-rate, cataract-reservation-rate, stop-reason)
5. **Phase 5** — 외래, 전체지표, 기타(outpatient-count, overall-exam-weekly, b2b-revenue)

각 Phase는 별도 PR + 마트 백필 스크립트 포함.

---

## 7. 스냅샷 스토어 마이그레이션

### 7.1 현재 사용처

- `SurgerySnapshotStore` — 파일(JSON) 저장, 관리자 확정 워크플로우 지원 (`saveSnapshot`, `fillSnapshot`, `locked` 필드)
- `ReservationSnapshotStore` — 동일 패턴 (예약 스냅샷)
- `.cache/stats/*.json` — 파일 캐시

### 7.2 흡수 계획

1. 마트 테이블에 `locked BOOLEAN`, `confirmed_by VARCHAR`, `confirmed_at TIMESTAMP` 컬럼 추가
2. 기존 스냅샷 파일 → 마트로 마이그레이션 스크립트 1회 실행
3. `SurgerySnapshotStore` API를 마트 upsert/read로 재구현 (외부 인터페이스 유지)
4. 안정화 후 파일 스토어 코드·`.cache/stats` 디렉토리 제거

---

## 8. 마이그레이션 순서 (PR 단위)

| PR | 내용 | 검증 |
|----|------|-----|
| **PR-1** | Datasource 이중화, Postgres 스키마 초안, `batch_run_log`/`batch_watermark`, `BatchOrchestrator` 뼈대 | Postgres 로컬 기동, 헬스체크 |
| **PR-2** | 수술 도메인 마트 3종(daily/monthly/list) + Phase 1 잡 + `SurgeryStatsMartRepository` | 마트 vs MSSQL 직결 값 대사(數 일치) |
| **PR-3** | Phase 1 Cutover (surgery 페이지 프로파일 스위치) + 스냅샷 마이그레이션 | 프론트 화면 검증 |
| **PR-4** | 예약 마트 + Phase 2 Cutover | 위와 동일 |
| **PR-5** | 검사 마트 + Phase 3 Cutover | |
| **PR-6** | 전환·성공률 마트 + Phase 4 Cutover | |
| **PR-7** | 나머지 마트 + Phase 5 Cutover | |
| **PR-8** | `Monthly reconcile` 잡, Admin rerun API, 파일캐시·스냅샷 스토어 코드 제거 | 전체 회귀 |

---

## 9. 리스크 & 완화

| 리스크 | 완화책 |
|-------|-------|
| CRM 소급 수정이 마트에 반영 안 됨 | 월말 자동 재계산 + 관리자 수동 재적재 API |
| 배치 실패 시 데이터 공백 | `batch_run_log` 모니터링, 재실행 idempotent 보장 (upsert/delete+insert) |
| 마트 vs 직결 값 차이 (검증 실패) | Phase마다 **대사 스크립트** 필수 — 최근 3개월 값 일치 확인 후 스위치 |
| Postgres 디스크 증가 (리스트 마트) | 월별 파티션 + 오래된 파티션 아카이빙 정책 (2년 이상 zip/삭제) |
| CRM 스키마 변경 시 배치 깨짐 | `docs/db/tables/*.md` 갱신 + 배치 통합테스트에 스키마 스모크 포함 |
| PII 확산 (Postgres 복제) | 접근 권한을 배치·API 서비스 계정으로만 제한, 감사 로그 활성화 |

---

## 10. 오픈 이슈 (착수 전 확정 필요)

- [ ] Postgres 인프라: 신규 인스턴스 vs 기존 `application-postgres.properties`의 것 재사용?
- [ ] 배치 실패 알림 채널 (Slack? 이메일?)
- [ ] Admin rerun API의 인증·인가 (기존 JWT 관리자 롤 재사용?)
- [ ] 리스트 파티션 보관 기간 (2년? 3년?)
- [ ] `LEGACY_VISION_SURGERY` 하드코딩 상수(2024~2026 1~4월)를 마트에도 적용할지 vs 마트는 실측만 저장하고 서비스 레이어에서 오버라이드할지
- [ ] 개발 환경: 로컬 개발자가 마트 없이도 프론트 개발 가능하도록 H2/mock 유지 여부

---

## 11. 참고

- 현재 SQL 자산: `backend/src/main/resources/sql/{domain}/*.sql`
- 스냅샷 저장 위치: `.cache/stats/` (마이그레이션 대상)
- DB 테이블 문서: `docs/db/tables/` (CRM MSSQL 스키마 참고용)
- Airflow 스크립트(참고용, 이번 스코프 밖): `docs/airflow/`
