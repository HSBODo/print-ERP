# 원데이 검사 소급 보정 (매월 보정 배치)

> 작성일: 2026-09-02 · 상태: **코드 착수 완료 (관리자 재실행 API 포함)**
> 목적: "원데이 검사로 찍혔다가 사후에 재검사 예약이 등록된 건"을 원데이에서 제외하는 소급 보정 로직을 매월 보정 배치에 추가하기 위한 조사·결정 정리.
>
> 📌 관련 문서
> - 배치 전략: `docs/databatch/strategy.md`
> - SMS 배치 사례: `docs/sms/strategy.md`
> - EXAM 도메인: `CLAUDE.md § 프로젝트 개요` (line 137)

---

## 1. 배경 · 원본 SQL

관리자가 개인 스크립트로 매월 실행하던 T-SQL (MSSQL) 로직을 프로젝트 매월 보정 배치에 통합하려 한다.

**원본 요청 SQL** (사용자 개인 스크립트)

```sql
DECLARE @from varchar(10) = '2026-07-01';   -- 전전월 1일
DECLARE @to   varchar(10) = '2026-08-31';   -- 전월 말일

UPDATE m
SET    m.원데이구분 = '일반'
FROM   검사마트 m
WHERE  m.검사일 BETWEEN @from AND @to
  AND  m.원데이구분 = '원데이'
  AND  EXISTS (
         SELECT 1
         FROM   RESERVATION r WITH (NOLOCK)
         WHERE  r.CUST_NUM       = m.고객번호
           AND  r.RESERVE_FLAG   = 'M'
           AND  r.RESERVE_JINRYO = '2'        -- 재검사 (취소 여부 무관)
           AND  r.RESERVE_DATE   > m.검사일   -- 검사일 이후 등록된 재검사
       );
```

**의미** — "원데이로 찍힌 검사 중, 같은 고객의 재검사 예약(`RESERVE_FLAG='M'` + `RESERVE_JINRYO='2'`) 이 그 검사일 이후에 등록됐다면 원데이 아님 (일반) 으로 되돌린다."

**왜 소급 보정이 필요한가**
- 재검사 예약이 검사 후 시간을 두고 등록되므로 매일 배치 시점에는 원데이로 판정
- 나중에 재검사 예약이 잡히면 실제로는 원데이가 아니었던 셈 → 사후 보정 필요

---

## 2. 프로젝트 코드 상태 조사 (2026-09-02)

### 2-1. `mart_list_exam.one_day` 컬럼

| 항목 | 값 | 위치 |
|---|---|---|
| 타입 | `VARCHAR(4) NOT NULL DEFAULT 'N'` | `sql/mart/exam/tables/V4c__list_exam.sql:62` |
| 값 형태 | **`'Y'` / `'N'`** (원데이 여부) | 동일 |
| MSSQL 원본 → 마트 변환 | `ExamListService` 가 `'원데이'` → `'Y'`, `'일반'` → `'N'` 매핑 후 insert | `insert-list-exam.sql:37` |
| 화면 표시 재변환 | 뷰가 `CASE WHEN one_day='Y' THEN '원데이' ELSE '일반' END` | `v_all_exam_list:76` |

**결론**: Postgres UPDATE 는 `one_day = 'N'` 으로 (원본 SQL 의 `'일반'` 에 해당).

### 2-2. 재검사 예약 정보 소스

**Postgres 마트에 없음.**
- `mart_list_reservation` (`V3b__list_reservation.sql`) 은 등록일·차트·의사·코멘트만 담고, `RESERVE_FLAG`·`RESERVE_JINRYO`·`RESERVE_DATE` 같은 세부 예약 상태값 없음.

**MSSQL 원본 `RESERVATION` 직결 필요.**
- 기존 `ExamListService` 도 이미 이 패턴 (배치 시점 MSSQL 조회 → Postgres 마트 저장)
- 정책 정합: 배치 시점만 MSSQL 조회, 화면은 마트만 조회 → SSH·VPN 끊어도 화면 무관 (`docs/databatch/strategy.md` 원칙 준수)

### 2-3. `mart_list_exam` 재생성 잡

- **위치**: `ExamMartJob.java:62-136` (`batch/job/`)
- **패턴**: 그 기간 데이터 delete + insert
- **소속**: `BatchOrchestrator.Domain.EXAM` — `ALL_DOMAINS` 안에 포함 (매일·매월 모두 재실행)

### 2-4. `mart_procedure_exam_monthly.one_day_exam_count` 산정

- **원천**: `mart_list_exam.one_day` (`select-exam-daily-agg.sql:29` — `COUNT(*) FILTER (WHERE exam_type='원데이')`)
- **파이프라인**: `mart_list_exam` → 일별 집계 뷰 → `ExamMartJob` 이 월 누적 → `upsert-procedure-exam-monthly.sql`
- **함의**: `mart_list_exam` 을 UPDATE 하면 **`mart_procedure_exam_monthly` 도 재계산 필수** (안 하면 두 마트가 어긋남)

### 2-5. 매월 보정 배치 범위

- **위치**: `BatchOrchestrator.java:132-147` — `@Scheduled(cron="${batch.mart.monthly-reconcile-cron:0 30 3 1 * *}")`
- **범위**: **전월만** (`prev = YearMonth.now().minusMonths(1)`, `from = prev.atDay(1)`, `to = prev.atEndOfMonth()`)
- **불일치**: 원본 SQL 은 **전전월~전월 (2개월)** — 결정 필요 (Q1)

---

## 3. 착수 전 확정 필요 (Q3개)

### Q1. 보정 범위 — 전월만 vs 전전월~전월

- **원본 SQL 의도**: 전전월~전월 2개월. 이유는 재검사 예약이 시간 두고 등록되기 때문. 전월만 보정하면 그전 달 잘못 판정된 것이 영영 남음.
- **프로젝트 현행 관례**: 전월만.
- **후보 답 (착수 시 결정)**: 원본 취지 살려 **전전월~전월(2개월)** 로 확장 검토.
  - 다만 이 확장은 매월 보정 배치 자체에 파장 (다른 도메인도 2개월로 재계산되는지, 아니면 원데이 보정만 별도 범위?)
  - 대안: 매월 보정 흐름에서 EXAM 은 그대로 전월만 재생성하되, 원데이 보정 단계만 별도 범위(전전월~전월) 적용

### Q2. 적용 시점 — 어디에 넣을지

- **(a)** `ExamMartJob` 안 `reconcileMonthly` 후처리 단계 — 매월 보정과 함께 (권장)
- **(b)** 별도 배치 도메인 (`Domain.EXAM_RECONCILE_ONEDAY`) — 원데이 보정만 독립. Slack·batch_run_log 별도 이력.

- **후보 답**: **(a)** — 매월 보정 흐름과 자연스러움. 별도 도메인은 관측이 산발적.

### Q3. 업데이트 → 재집계 순서 (원자성)

원칙: 한 트랜잭션 안에서 처리해야 두 마트 정합 유지.

**단계**
1. MSSQL 원본에서 원데이 → 일반 후보 조회 — 반환값 `(chart_no, exam_date)` 또는 `(customer_id, exam_date)` 쌍 목록
2. Postgres `mart_list_exam` UPDATE — `one_day = 'N'`, WHERE `(chart_no, exam_date) IN (...)` 또는 `exam_date BETWEEN :from AND :to AND one_day = 'Y' AND EXISTS (...)`. 후자는 Postgres FDW 없이는 불가라 실질적으로 전자.
3. 대상 월의 `mart_procedure_exam_monthly` 재집계 — daily-agg 뷰 → `upsert-procedure-exam-monthly.sql`

**함정** — MSSQL/Postgres 분리라 EXISTS 를 SQL 한 방으로 못 씀. 반드시 두 단계 (MSSQL 조회 → 결과 리스트로 Postgres UPDATE).

---

## 4. 스코프 스케치 (다음 세션 착수용)

### 신설 파일
- `backend/src/main/resources/sql/softcrm/exam/select-onedays-with-later-reexam.sql`
  - MSSQL 조회: 원본 SQL 을 SELECT 로 변환
  - 파라미터: `:from`, `:to`
  - 반환: `chart_no`, `exam_date` 쌍 (또는 `customer_id`)
- `backend/src/main/resources/sql/mart/exam/update-list-exam-oneday-to-normal.sql`
  - Postgres UPDATE `mart_list_exam SET one_day = 'N'` — IN 절 or 파라미터 배치
- `backend/src/main/java/com/bviit/analytics/exam/repository/ExamOnedayReconcileRepository.java` (신설)
  - MSSQL 조회 (`statsJdbcTemplate`) + Postgres UPDATE

### 변경 파일
- `backend/src/main/java/com/bviit/analytics/batch/job/ExamMartJob.java`
  - `reconcileMonthly(from, to)` 후처리 단계 추가: 원데이 보정 → 그 월 monthly 재집계
- `docs/exam/onedays-reconcile.md` (이 문서) — 진행 이력 추가

### 관측 (batch_run_log · Slack)
- `ExamMartJob` 이 이미 `runWithLog` 통과. 추가 stats 항목: `oneday_reconciled` (원데이 → 일반 전환 건수)
- 실패 시 Slack 알림 자동

---

## 5. 정책 정합

**외부 DB 접근 차단 목표 (memory 정책)**
- 배치 시점 MSSQL 조회는 **예외 허용** (기존 `ExamListService`·`ExamListRepository` 도 동일 패턴)
- 화면은 마트만 조회 → SSH·VPN 끊어도 화면 무관
- 이번 보정 로직도 같은 원칙: 배치 시점만 MSSQL 접근, 결과는 Postgres 마트 UPDATE

**CLAUDE.md 참고**
- "신규 통계 API 는 `statsJdbcTemplate`(MSSQL) 화면 직결 금지 — 마트 + 배치 Job 함께 구성" (line 215-218)
- 이번 보정은 배치 안이라 정합

---

## 6. 진행 이력

| 날짜 | 단계 | 커밋 | 내용 |
|------|------|------|------|
| 2026-09-02 | 조사 | `05d406a` | 5개 결정 지점 확정 · Q1~Q3 남김 · 스펙 초안 문서화 |
| 2026-09-02 | 착수 | | Q1=B(전전월~전월) · Q2=(a) ExamMartJob 후처리 · Q3=한 트랜잭션 확정. 파일 5개 신설·변경 (SQL 2 · Repository 1 · ExamMartJob + BatchOrchestrator). 매월 1일 03:30 자동 스케줄러에서 ALL_DOMAINS 후 원데이 보정 자동 실행. |
| 2026-09-02 | 관리자 API | | `POST /api/admin/batch/exam/reconcile-oneday-flag?from=&to=` 신설 — 스케줄러 실패·backfill·개발 검증용. min-year 가드 없음. batch_run_log MANUAL 이력 + Slack 알림 자동. |
| 2026-09-02 | 관측 보강 | | `ExamMartJob.reconcileOnedayFlag` 에 후보 (chart_no\|exam_date) 목록 INFO 로그 추가. UPDATE 후에는 list_exam 상 표식이 없어 사후 재구성 불가 — 로그가 유일 원천. grep 키워드: `reconcileOnedayFlag candidates`. |
| 2026-09-02 | 관측 보강 2 | | UPDATE 절에 `RETURNING chart_no, exam_date` 추가 → repository 가 실제 뒤집힌 쌍 리스트 반환 → `updated pairs (N): [...]` INFO 로그. `candidates` 는 MSSQL 후보 전체(=511), `updated pairs` 는 실제 뒤집힌 것(=78) — 두 줄 다 남는다. grep 키워드: `reconcileOnedayFlag updated pairs`. |
| _다음_ | 검증 | | dev/prod 배포 후 실제 실행 확인 · 초기 실행 결과로 임계치·후보 분포 재점검 |
