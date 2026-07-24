# 배치 실행 규칙과 마트별 정책

> 작성일: 2026-07-16
> 배경 문서: [`strategy.md`](./strategy.md) · [`mart-menu-mapping.md`](./mart-menu-mapping.md) · [`legacy-homepage-source-strategy.md`](./legacy-homepage-source-strategy.md)
> 대상: 배치 잡의 write 정책·수동 실행 시 동작·마트별 특수 조건을 한 곳에 정리

---

## 0. 요약

- **원본(MSSQL·MariaDB) → 매일 03:00 배치 → Postgres 마트 → 앱 조회** 구조.
- **모든 배치는 idempotent** — 재실행해도 중복 행 안 생김. 두 패턴:
  - **UPSERT** (월별 집계) — `ON CONFLICT DO UPDATE`
  - **DELETE + INSERT** (리스트) — 범위 delete 후 재삽입
- **`min-year=2026` 가드**로 24·25 확정값(시드) 을 배치가 실수로 덮지 못하게 방어. **자동·수동 모두 적용** (예외: `stop-reason`·`b2b-revenue` 는 필터 없음).
- **관리자 수동 실행** (`runManual`) 은 `runDaily` 의 top-level 스킵만 우회 — 24·25 재계산은 대부분 시드 SQL 직접 수정이 유일한 경로.
- **트랜잭션은 도메인 단위 all-or-nothing** — 도메인 안 한 개 잡이 실패하면 그 도메인 전체 롤백.

---

## 1. 모든 배치의 공통 조건

### 1-1. 활성화 조건

| 조건 | 값 |
|---|---|
| Spring 프로파일 | `postgres-mart` (local/dev/prod 프로파일 그룹이 자동 포함) |
| `batch.mart.enabled` | `true` (`false` 이면 스케줄러·수동 실행 모두 skip) |

### 1-2. 스케줄 (`BatchOrchestrator`)

| 시각 (Asia/Seoul) | 유형 | 범위 | 대상 |
|---|---|---|---|
| **매일 03:00** | `DAILY` | D-1 (어제) | 전 도메인 |
| **매일 10:00** | `DAILY` (intraday) | D-1 | 예약통계 일별 마트만 재실행 (콜센터 늦반영 흡수) |
| **매월 1일 03:30** | `MONTHLY_RECONCILE` | 전월 전체 | 전 도메인 (현재 비활성 — cron `-`) |
| **관리자 수동** | `MANUAL` | 지정 범위 | 전 도메인 or 지정 도메인 |

### 1-3. 안전장치

**(a) `min-year=2026` 가드** — 24·25 는 seed 파일로 마트에 확정 저장되어 있고, 배치가 이 연도에 대해 write 자체를 시도하지 않는다. 시드 값 훼손 방지.
- 각 잡 내부에 `.filter(m -> m.getYear() >= minYear)` 필터가 있어 **자동·수동 관계없이** 24·25 는 upsert 대상에서 걸러진다.
- `runDaily` 의 **top-level 연도 스킵**(어제 연도가 24·25 면 배치 자체 중단)은 `runManual` 이 우회하지만, 잡 내부 필터는 그대로 적용됨 → 결과적으로 24·25 write 는 대부분 막힌다.
- **예외 2개**: `mart_stop_reason_monthly` (24·25 시드가 없어 min-year 필터 미적용, 코드 주석에 명시) · `mart_b2b_revenue_monthly` (필터 자체 없음). 이 둘은 수동 실행 시 24·25 도 덮어씀.

**(b) 트랜잭션 · 도메인 단위 all-or-nothing** — 각 `*MartJob.run(from, to)` 이 `@Transactional`. 잡 안의 여러 write 중 하나라도 실패하면 전체 롤백 (Postgres write 만 대상 — MSSQL·MariaDB read 는 별도 datasource 로 트랜잭션 무관).

**(c) 도메인 간 순차 실행** — `BatchOrchestrator.runDomains` 에서 SURGERY → RESERVATION → EXAM → CONSULTATION → OUTPATIENT → OVERALL → ETC 순. 하나가 예외 던지면 뒤 도메인은 실행 안 됨.

**(d) 원본 시스템 미접근 (앱 조회 시)** — 컨트롤러는 오직 Postgres 마트만 조회. 원본(MSSQL·MariaDB) 은 배치 시점에만 접근.

### 1-4. 관측

- **`batch_run_log`** — 매 실행마다 새 행 (`RUNNING → SUCCESS/FAILED`, `table_stats` JSON 에 각 마트별 upsert 행 수).
- **`batch_watermark`** — 도메인별 마지막 성공 적재일 (다음 daily 배치의 시작점).
- **Slack 알림** — 실패 시 스택 요약 자동 전송 (`LOGGING_SLACK_*` 프로파일별 활성).

### 1-5. 재실행 안전 (idempotent)

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

## 2. 마트별 정책 (도메인 순)

### 2-1. RESERVATION 도메인

실행 순서: `ReservationListHomepageMartJob` → `ReservationMartJob` → `ReservationStatsDailyMartJob`

| 마트 | 잡 | 패턴 | 소스 | min-year | 특수 조건 |
|---|---|---|---|---|---|
| `mart_list_reservation_homepage` | ReservationListHomepageMartJob | DELETE+INSERT (reg_date) | MariaDB `TBL_COUNSEL` (SSH 터널 경유) | 없음 | 홈페이지 소스 URL 미설정 시 skip. **다른 잡보다 먼저 실행** — 종합 계산이 이 마트를 읽기 때문 |
| `mart_reservation_monthly` | ReservationMartJob | UPSERT (yr, mo) | MSSQL | ✅ 적용 | 24·25 는 V9/V12 시드 보호 |
| `mart_reservation_overall_monthly` | ReservationMartJob | UPSERT (yr, mo) | MSSQL + 홈페이지 마트 | ✅ 적용 | 24·25 는 V12 시드 · 2026-01~ 는 네이버+카카오+홈페이지(리스트 화면과 동일한 raw) 공식 · 조회는 라이브 SUM 이라 마트 값은 실제로는 읽히지 않음(오버라이드 즉시 반영용) · 현재 진행 중인 달은 부분값 노출 |
| `list_reservation` | ReservationMartJob | DELETE+INSERT (registered_at) | MSSQL | 없음 | 취소·수정건 자동 흡수 |
| `mart_reservation_kakao_daily` | ReservationMartJob | DELETE+INSERT (dt) | MSSQL | 없음 | 해피톡 카카오 예약 참고용 |
| `mart_reservation_stats_system_daily` | ReservationStatsDailyMartJob | UPSERT (stat_date) | MSSQL | ✅ 적용 | **2026-H1 (1~6월) V19 시드 + period_lock** — 배치가 이 6개월 안 덮음 |
| `mart_reservation_stats_cataract_daily` | ReservationStatsDailyMartJob | UPSERT (stat_date) | MSSQL | ✅ 적용 | **2026-H1 V20 시드 + period_lock** |

### 2-2. SURGERY 도메인 (`SurgeryMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_surgery_daily` | UPSERT (stat_date) | 없음 | 각 날짜 개별 upsert |
| `mart_surgery_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V15 시드 |
| `list_surgery` | DELETE+INSERT | 없음 | 취소·수정 흡수 |

### 2-3. EXAM 도메인 (`ExamMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_examination_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V9·V16 시드 |
| `mart_procedure_exam_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V9 시드 |
| `list_exam` | DELETE+INSERT (exam_date) | 없음 | |
| `list_cataract_exam` | DELETE+INSERT (exam_date) | 없음 | Cataract_Exam 스냅샷 특성상 과거월 소급 변동 가능 |

### 2-4. CONSULTATION 도메인 (`ConsultationMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_consultation_rate_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V18 시드 |
| `mart_stop_reason_monthly` | UPSERT (yr, mo) | **적용 안 함** | 24·25 시드 없음. 배치가 전 연도 덮어씀 — 24·25 값을 고치려면 소스 SQL 수정 후 재실행 |
| `mart_reservation_rate_monthly` (vision) | UPSERT (yr, mo, category) | ✅ 적용 | 24·25 는 V13 시드 |
| `mart_reservation_rate_monthly` (cataract) | UPSERT (yr, mo, category) | ✅ 적용 | 24·25 는 V13 시드 |

### 2-5. OUTPATIENT 도메인 (`OutpatientMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_outpatient_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 시드 값 |

### 2-6. OVERALL 도메인 (`OverallMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_overall_exam_monthly` | UPSERT (yr, mo) | ✅ 적용 | 24·25 는 V14 시드 · 현재 달은 `partial=true` 플래그로 노출 |
| `mart_overall_exam_weekly` | UPSERT (yr, iso_week) | ✅ 적용 | 주 단위 지표 |

### 2-7. ETC 도메인 (`EtcMartJob`)

| 마트 | 패턴 | min-year | 특수 조건 |
|---|---|---|---|
| `mart_b2b_revenue_monthly` | UPSERT (yr, mo) | **적용 안 함** | B2B 매출. min-year 필터 없음 — 24·25 도 수동 배치로 덮어씀 |

---

## 3. 수동 배치 (Admin API)

### 3-1. 엔드포인트

```bash
POST /api/admin/batch/rerun?from=YYYY-MM-DD&to=YYYY-MM-DD&domain=ALL|SURGERY|RESERVATION|EXAM|CONSULTATION|OUTPATIENT|OVERALL|ETC
Authorization: Bearer <JWT>
```

`domain` 미지정 or `ALL` → 전 도메인 순차 실행.

### 3-2. 자동 배치와의 차이

| 항목 | 자동 (DAILY/MONTHLY_RECONCILE) | 수동 (MANUAL) |
|---|---|---|
| `runDaily` top-level 연도 스킵 (D-1 이 24·25 면 배치 자체 중단) | 적용 | 우회 (실행 자체는 진행됨) |
| 각 잡 내부 `min-year` 필터 (24·25 upsert 차단) | 적용 | **적용 — 수동도 못 덮음** (stop-reason, b2b-revenue 제외) |
| 실행 범위 | D-1 (daily) 또는 전월 (reconcile) | 지정 범위 자유 |
| `batch_run_log.run_type` | `DAILY` / `MONTHLY_RECONCILE` | `MANUAL` |
| period_lock (V19/V20 예약통계 2026-H1) | 존중 | 존중 (수동도 못 덮음) |

**정리**: `runManual` 은 실행을 트리거하지만, 각 잡 안에서 24·25 는 여전히 필터로 걸러진다. 24·25 를 재계산하고 싶다면 대부분의 마트는 시드 SQL(V9·V13·V14·V15·V16·V18) 을 직접 수정해야 함.

### 3-3. 수동 실행 시 동작 요약

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

### 3-4. 실패 시

- 도메인 안 한 잡이라도 예외 던지면 그 도메인 전체 롤백 → 그 도메인의 어떤 마트도 이번 실행분 반영 안 됨.
- `batch_run_log.status = FAILED`, `error_message` 에 예외 요약.
- Slack 알림 발송.
- 뒤 도메인은 실행 안 됨 (RESERVATION 이 실패하면 EXAM 이후 안 돎).

### 3-5. 재실행 언제 안전한가

- 언제든 안전 — idempotent 설계.
- 다만 실행 중 재실행하면 락 대기·부하 이슈 있을 수 있음. `batch_run_log` 로 진행 상태 확인 후 실행 권장.

---

## 4. 특수 마트 상세

### 4-1. `mart_reservation_stats_system_daily` · `mart_reservation_stats_cataract_daily` (V19/V20 period_lock)

- **2026-01 ~ 2026-06 은 seed 값 (엑셀 원본)** 이며 `reservation_stats_period_lock` 테이블로 잠금.
- 배치가 이 6개월 범위에 대해 upsert 시 lock 체크 → 스킵.
- 수동 실행도 이 잠금을 존중 — 잠금을 해제하려면 `reservation_stats_period_lock` 에서 해당 period 를 삭제해야 함 (설계상 의도된 절차).

### 4-2. `mart_list_reservation_homepage` (신규 · MariaDB 소스)

- 유일하게 **MariaDB 소스** (다른 마트는 MSSQL).
- SSH 터널 사이드카 없이 analytics 컨테이너 내부에서 sshpass 로 터널 오픈 (`docker/entrypoint.sh`).
- 소스 미설정(`homepage.datasource.url` 없음) 시 배치 잡이 skip 하고 다른 잡은 계속.
- 배치 순서상 **가장 먼저 실행** — `ReservationOverallStatsService` 가 종합 계산에서 이 마트를 읽기 때문.
- 상세 배경: [`legacy-homepage-source-strategy.md`](./legacy-homepage-source-strategy.md)

### 4-3. `mart_reservation_overall_monthly` (온라인 예약 공식 · coverageMonth)

- **2026-01 부터 온라인 = 네이버 + 카카오톡 + 홈페이지(리스트 화면과 동일한 raw · 전 진료 · `COUNT(*)`)** — 그 이전(2024·2025) 은 V12 시드 그대로.
- **조회 경로는 마트 대신 라이브 SUM** — 예약통계_시력교정 셀 오버라이드가 예약 종합·월간 레포트에 즉시 반영되도록 매 요청마다 시력교정 마트 + 홈페이지 마트에서 SUM. 배치가 채운 마트 값은 폴백용으로만 남음.
- `coverageMonth` 로직으로 홈페이지 커버리지 판정:
  - **과거 달**: 홈페이지 마지막 등록일이 그 달 말일이 아니면 미커버로 판정 → null
  - **현재 진행 중인 달**: 부분값이라도 노출 (2026-07 부터 정책 완화, 커밋 `ceca8a0`)
- 프론트에서 부분값을 완월값으로 오해할 여지 있음 — 향후 `partial` 플래그 노출 검토 필요.

---

## 5. 자주 묻는 질문

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
