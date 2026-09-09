# 원데이 검사 — 분류·보정 종합 문서

> 작성일: 2026-09-02 (reconcile 착수) · 2026-09-09 (레거시 정렬 · 문서 통합)
> 관련: [`docs/db/지표정의.md §1.9.2`](../db/지표정의.md) · [`docs/점검/원데이-레거시-비교_2026-07.md`](../점검/원데이-레거시-비교_2026-07.md)

---

## 1. 개요

**원데이 검사** = 검사자 리스트(EXAM) 중 같은 날 검사OP 예약으로 내원한 건. 단 검사일 이후 재검사(M/2) 예약이 등록되면 일반으로 되돌린다.

레거시 관리자가 개인 T-SQL 로 유지하던 두 로직(판정 + 소급 보정) 을 프로젝트 마트로 이관·통합한 결과.

**두 축**:
1. **판정 (분류)** — M/5·M/7 예약 존재 → `list_exam.one_day='Y'` 로 적재 (§2)
2. **소급 보정 (reconcile)** — 검사일 이후 재검사(M/2) 예약 등록 → 'N' 으로 되돌림 (§4)

---

## 2. 판정 공식 · SQL 위치

**공식**: 같은 고객·같은 날짜에 `RESERVATION.RESERVE_FLAG='M'`, `RESERVE_JINRYO IN ('5','7')`, `RESERVE_STATE IN ('I','H')` 존재.

- **M/5 (검사OP)** — 원 시력교정 당일OP
- **M/7 (검사OP(Re))** — 재수술 당일OP (**2026-09-09 포함**, §3)

**SQL 5곳** (`RESERVE_JINRYO IN ('5','7')`):

| 파일 | 용도 |
|---|---|
| `sql/softcrm/exam/select-exam-list.sql` (line 28) | 검사자 리스트 · **`list_exam` 마트 적재 소스** |
| `sql/softcrm/exam/select-all-exam-list.sql` (line 72) | 전체 검사자 리스트 (MSSQL 직결, 대사용) |
| `sql/softcrm/exam/select-one-day-exam-count-monthly.sql` (line 36) | 검사건수 원데이 월별 (MSSQL 직결, 대사용) |
| `sql/softcrm/overall/select-one-day-daily.sql` (line 60) | 주간 종합지표 원데이 일별 (MSSQL 직결, 대사용) |
| `sql/softcrm/consultation/select-monthly-vision-rates.sql` (line 24) | 상담 성공률 `od` 플래그 (MSSQL 직결, 대사용) |

**화면 정합은 `select-exam-list.sql` 하나가 결정.** 이 SQL 결과가 `list_exam` 마트에 적재되고, 화면(리스트·월별·주간·상담 성공률) 모두 이 마트를 접어 만든 마트를 조회한다. 나머지 4개는 마트 vs MSSQL 대사(reconcile 로그) 를 위해 같은 판정을 유지해야 함.

---

## 3. 2026-09-09 결정 — 재수술 당일OP(M/7) 원데이 포함 (레거시 정렬)

### 배경

전체 검사자 리스트 8월 원데이가 대시보드 **520** · 레거시 **497** 로 어긋남. 원본(SOFTCRM) 행 단위 대조로 원인 확정:

| # | 항목 | 대시보드(기존) | 레거시 | 처리 |
|---|---|---|---|---|
| ① | 사후 재검사 예약이 잡힌 원데이 | 원데이 유지 | 일반으로 되돌림 | §4 reconcile 로 이미 처리. **재적재 후 유실 사건** 관련 §5 |
| ② | 재수술 당일OP(`검사OP(Re)`, M/7) | 일반 | 원데이 | **본 결정으로 원데이 포함** — 2026-07-29 결정("일반") 을 뒤집음 |

### 결정

2026-07-29 결정 "재수술 당일OP 는 일반" 을 **뒤집어 레거시와 정렬**. 결정 기록: [`../점검/원데이-레거시-비교_2026-07.md`](../점검/원데이-레거시-비교_2026-07.md) §4-③.

### 반영

SQL 5곳 (§2 표) · 마트 SQL 상단 주석 (`V56__v_all_exam_list_surgery_columns.sql`, `V4c__list_exam.sql`) · 지표정의 §1.9.2 · 원데이-레거시-비교 §4-③.

### 예상 월별 수치

**시력교정 EXAM 기준 (`list_exam.one_day='Y'`, 백내장 원데이 별도 가산)**:

| 월 | 기존 (M/5만) | B 후 + 보정 후 | 레거시 | 차이 |
|---|---:|---:|---:|---:|
| 2026-06 | 513 | **495** | 493 | +2 |
| 2026-07 | 556 | **530** | 530 | 0 |
| 2026-08 | 519 | **496** | 497 | −1 |

레거시 대비 ±0~2건 차이는 **레거시 집계 이후 등록된 재검사** 때문 (정상 범위).

---

## 4. 사후 재검사 보정 (reconcile)

### 배경 · 원본 SQL

관리자가 개인 T-SQL 로 매월 실행하던 것:

```sql
UPDATE 검사마트 SET 원데이구분 = '일반'
WHERE 검사일 BETWEEN @from AND @to
  AND 원데이구분 = '원데이'
  AND EXISTS (
    SELECT 1 FROM RESERVATION r
    WHERE r.CUST_NUM = m.고객번호
      AND r.RESERVE_FLAG = 'M' AND r.RESERVE_JINRYO = '2'  -- 재검사, 취소 무관
      AND r.RESERVE_DATE > m.검사일                          -- 검사일 이후 등록
  );
```

**의미**: 원데이로 찍힌 검사 중 검사일 이후 재검사 예약이 등록됐다면 → 일반. 재검사 필요성이 확인됐다는 사실 자체가 "당일 결정 실패" 신호.

### 프로젝트 이관 (2026-09-02)

MSSQL/Postgres 분리라 EXISTS 를 한 방으로 못 씀 — 두 단계로 나눔:

1. **MSSQL 후보 조회**: `select-onedays-with-later-reexam.sql` — `(chart_no, exam_date)` 쌍 반환
2. **Postgres list_exam UPDATE**: `update-list-exam-oneday-to-normal.sql` — 후보 중 `one_day='Y'` 인 행만 `'N'` 으로. `RETURNING` 으로 실제 뒤집힌 쌍 회수.
3. **`mart_procedure_exam_monthly` 재집계**: list_exam 이 원천이라 UPDATE 후 monthly 를 다시 접지 않으면 두 마트가 어긋남.

세 단계가 **한 트랜잭션** — 실패 시 통째로 롤백.

### 신설 파일 (2026-09-02)

- `sql/softcrm/exam/select-onedays-with-later-reexam.sql`
- `sql/mart/exam/update-list-exam-oneday-to-normal.sql`
- `com.bviit.analytics.exam.repository.ExamOnedayReconcileRepository`
- `ExamMartJob.reconcileOnedayFlag(from, to)` (Postgres UPDATE + monthly 재집계)

### 관측 (`batch_run_log` · Slack)

- stats: `oneday_reconciled` (list_exam UPDATE 건수) · `mart_procedure_exam_monthly_reconciled`
- INFO 로그:
  - `reconcileOnedayFlag candidates (N): [chart|date, ...]` — MSSQL 후보 전체
  - `reconcileOnedayFlag updated pairs (N): [chart|date, ...]` — 실제 뒤집힌 쌍
- 후보 로그는 UPDATE 후 list_exam 상 표식이 사라져 사후 재구성 불가 — 그 시점의 원본 상태를 봉인.

---

## 5. 자동 트리거 정책

`reconcileOnedayFlag(from, to)` 를 언제 부를지:

| 트리거 | 범위 | 상태 |
|---|---|---|
| **매월 1일 03:30 스케줄러** | 전전월~전월 (2개월) | ✅ 활성 (2026-09-09 재활성화) |
| **관리자 수동 API** (`POST /api/admin/batch/exam/reconcile-oneday-flag?from=&to=`) | 지정 범위 | ✅ 상시 |
| ~~재적재 직후 자동 보정 (A안)~~ | run() 과 동일 범위 | ❌ 미채택 (사람 규율로 커버) |

### 왜 A안 미채택

**문제 배경 (2026-09-09 사건)**:
`ExamMartJob.run()` 은 기간 delete+insert 라 `list_exam.one_day` 가 원본 판정값(사후 재검사 반영 전) 으로 되돌아감. 실제 사례: 09-02 보정(78쌍) → 09-09 10:21 EXAM 수동 재적재(07-01~08-31) → 화면 520 으로 복귀.

**A안 (검토됨, 미채택)**:
`BatchOrchestrator.runDomains()` 의 EXAM 분기에서 `examMartJob.run()` 직후 같은 범위로 `reconcileOnedayFlag` 를 이어붙임 → 재적재마다 자동 재보정.

**미채택 이유**:
- 매일 D-1 배치는 하루짜리 범위라 A안 실효 제한적 (검사 당일 등록된 재검사만 잡음)
- 월 스케줄이 지연 등록 재검사(주된 케이스)를 흡수함
- 관리자 수동 재적재 경로는 **아래 규율로 대체**

### 관리자 재적재 후 정합 절차 (필수)

```
1) EXAM 재적재  (관리자 화면)
2) POST /api/admin/batch/exam/reconcile-oneday-flag?from=<범위>&to=<범위>
```

2 를 빠뜨리면 사후 재검사 보정이 유실됨 → 다음 달 1일 03:30 까지 어긋난 상태. 09-09 사건의 재발 지점이므로 반드시 함께 실행.

---

## 6. 검증

### 진단 SQL (MSSQL, 읽기 전용)

세 규칙을 한 번에 비교. `@from`/`@to` 만 바꿔서 월별 확인.

```sql
DECLARE @from date = '2026-08-01', @to date = '2026-08-31';
SELECT
  SUM(ours) AS current_rule,                                             -- 당일 M/5 I/H (B 전)
  SUM(CASE WHEN ours=1 AND later=0 THEN 1 ELSE 0 END) AS with_reexam_fix,  -- 보정 적용
  SUM(CASE WHEN (ours=1 OR re=1) AND later=0 THEN 1 ELSE 0 END) AS legacy_rule  -- B+보정
FROM (
  SELECT e.CUST_NUM,
    CASE WHEN EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK) WHERE r.CUST_NUM=e.CUST_NUM AND r.RESERVE_DATE=e.EXAM_DATE
                      AND r.RESERVE_FLAG='M' AND r.RESERVE_JINRYO='5' AND r.RESERVE_STATE IN ('I','H')) THEN 1 ELSE 0 END AS ours,
    CASE WHEN EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK) WHERE r.CUST_NUM=e.CUST_NUM AND r.RESERVE_DATE=e.EXAM_DATE
                      AND r.RESERVE_FLAG='M' AND r.RESERVE_JINRYO='7' AND r.RESERVE_STATE IN ('I','H')) THEN 1 ELSE 0 END AS re,
    CASE WHEN EXISTS (SELECT 1 FROM RESERVATION r WITH(NOLOCK) WHERE r.CUST_NUM=e.CUST_NUM
                      AND r.RESERVE_FLAG='M' AND r.RESERVE_JINRYO='2' AND r.RESERVE_DATE > e.EXAM_DATE) THEN 1 ELSE 0 END AS later
  FROM EXAM e WITH(NOLOCK) JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM=e.CUST_NUM
  WHERE e.EXAM_DATE BETWEEN @from AND @to
    AND NOT (ISNULL(cu.CUST_NAME,'') LIKE N'%테스트%' OR LOWER(ISNULL(cu.CUST_NAME,'')) LIKE '%test%')
    AND NOT (ISNULL(e.EXAM_MEMO,'') LIKE N'%테스트%' OR LOWER(ISNULL(e.EXAM_MEMO,'')) LIKE '%test%')
) t;
```

### Postgres 마트 확인

```sql
-- 시력교정 원데이 (반영 후 기대치 = 레거시 ±0~2)
SELECT one_day, count(*)
  FROM list_exam
 WHERE exam_date BETWEEN '2026-08-01' AND '2026-08-31'
 GROUP BY 1;

-- 월별 마트 (화면 원데이 = list_exam + list_cataract_exam 합)
SELECT yr, mo, one_day_exam_count
  FROM mart_procedure_exam_monthly
 WHERE yr = 2026 AND mo BETWEEN 6 AND 8;
```

### 상태 진단표 (관측 숫자로 상황 판별)

| 관찰값 (8월) | 의미 | 처리 |
|---:|---|---|
| **520** | B 전 · 보정 유실 (M/5 only) | 재적재 필요 |
| **531** | B 후 · 보정 미반영 (M/5+M/7 raw) | reconcile 실행 필요 |
| **497** | B 후 · 보정 완료 (완전 정합) | ✅ 목표 |

---

## 7. 8월 사후 재검사 33건 성격 참고

| 재검사 예약 상태 | 건수 |
|---|---:|
| 내원(I) | 15 |
| 미내원(Y) | 13 |
| 취소(C) | 5 |

모두 8월 29일 이전 등록. 레거시 스크립트와 동일하게 **취소 건도 일반으로 되돌림** — "재검사가 필요하다고 판단됐다" 는 사실이 시그널이고, 나중 상황 변경은 뒤집지 않음.

당일재검사(M/16) 4건은 당일 M/5 가 함께 있어 양쪽 모두 원데이로 세며 차이에 영향 없음.

---

## 8. 병원 실무 정합성 참고

원데이 판정 공식 자체는 **레거시 관례를 그대로 계승** — 몇 년간 문제 없이 운영됨.

**잠재 오분류** (예약 코드 등록 관습에 달림):

| # | 케이스 | 판정 | 실제 |
|---|---|---|---|
| 1 | 원데이 수술 후 사후 검진을 M/2 로 등록 | 일반으로 뒤집힘 | ❌ 원데이여야 함 |
| 2 | 재수술 결정 시 재수술 전 검사를 M/2 로 등록 | 일반으로 뒤집힘 | ❌ 원 검사는 원데이 |
| 3 | 재검사 예약 후 바로 취소 (실수 예약) | 일반으로 뒤집힘 | ⚠️ 정책상 뒤집음 (원본 SQL 취지) |

**통상 실무 관행**:
- 원데이 수술 후 사후 검진 → **F(외래)** 로 잡음. M/2 아님
- 재수술 전 검사 → 별도 코드 (M/6 당일재검사, M/7 재수술 당일OP 등)

관습이 지켜지면 오분류 0. 확인이 필요하면 `reconcileOnedayFlag updated pairs` 로그를 표본으로 정성 점검 가능.

---

## 9. 진행 이력

| 날짜 | 단계 | 커밋 | 내용 |
|------|------|------|------|
| 2026-09-02 | reconcile 최초 도입 | `05d406a` 외 | Q1=전전월~전월 · Q2=(a) ExamMartJob 후처리 · Q3=한 트랜잭션. SQL 2·Repo 1·ExamMartJob + BatchOrchestrator. 매월 1일 03:30 자동 스케줄 + 관리자 수동 API. |
| 2026-09-02 | 관측 보강 | | 후보/실제 뒤집힘 목록 INFO 로그. `RETURNING chart_no, exam_date` 로 실제 UPDATE 쌍 회수. |
| 2026-09-04 | 자동 실행 임시 중단 | `6c1b257` | 월 배치 자동 실행 블록 주석 처리. 관리자 수동 API 로만 유지. |
| 2026-09-09 | 8월 어긋남 조사 | | 대시보드 520 · 레거시 497. 원인 확정: ① 재적재 후 소급 보정 유실 (78쌍) ② 재수술 당일OP(M/7) 미포함. |
| 2026-09-09 | **B안 · 기존 되살리기** | | SQL 5곳 M/5→IN('5','7'). 마트 SQL 주석·지표정의·원데이-레거시-비교 문서 갱신. 월 배치 자동 실행 재활성화. A안(재적재 직후 자동) 은 미채택 — 관리자 수동 API 규율로 대체. 두 원데이 문서(oneday-legacy-align + onedays-reconcile) 통합. |
| _다음_ | 검증 | | 재적재 + 수동 reconcile 후 8월 기대치 496 (레거시 497 ±1) 확인 |
