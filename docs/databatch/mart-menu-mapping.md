# 마트 테이블 ↔ 메뉴 매핑과 데이터 흐름

> 작성일: 2026-07-15
> 목적: "이 화면 숫자는 어디에서 오는가"·"화면에서 값을 바꾸면 다른 지표에도 반영되는가"에 대한 표준 답.
> 배경 문서: [`docs/databatch/strategy.md`](./strategy.md) (배치 전환 전략)

---

## 0. TL;DR

- **모든 지표 숫자 = 마트 테이블에 미리 저장된 값을 그대로 조회**. 프론트 계산·재집계 없음.
- **각 배치는 MSSQL 원본을 독립적으로 읽어 자기 도메인 규칙으로 계산 → 자기 마트에 upsert**. 마트끼리 참조하지 않음.
- **매일 03시 배치가 그 달 전체를 다시 계산해 덮어쓰기(upsert)** — 누적 아니라 스냅샷 갱신.
- **화면에서 셀 값을 바꿔도 다른 지표에는 자동 전파되지 않음** — override는 그 화면 국지 표시용 audit 로그.
- **전 지표에 영향을 주는 정정이 필요하면 MSSQL 원본을 고치는 것이 유일한 근본 경로**.

---

## 1. 표준 데이터 흐름

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

### 계산 위치의 원칙

| 계층 | 하는 일 | 안 하는 일 |
|---|---|---|
| 배치 | 원본 read → aggregation → 마트 upsert | 화면 지향 포맷팅, override 판단 |
| 마트 | 결과 저장 (컬럼 단위 스칼라) | 다른 마트 참조, 파생 계산 |
| API | 마트 SELECT + override 얹기 + DTO 변환 | 원본 read, 지표 계산 |
| 프론트 | 렌더, 필터/정렬(클라 사이드) | 재집계, 원본 접근 |

---

## 2. 마트 테이블 ↔ 메뉴 매핑

### 2-1. 대체로 1:1 (메뉴 하나 = 마트 하나)

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

### 2-2. 1:N (한 테이블 → 여러 화면)

| 마트 | 공유하는 메뉴 |
|---|---|
| `mart_reservation_overall_monthly` | 예약 종합 + 월간 레포트 (`online` 컬럼 동일 값) |
| `mart_surgery_monthly` | 수술 건수 + 주요 수술별 비중 + 수술별 비중 |

### 2-3. 1:2 (한 도메인 → 월별 · 주별 두 테이블)

| 도메인 | 월별 마트 | 주별 마트 |
|---|---|---|
| 검사자 종합지표 | `mart_overall_exam_monthly` | `mart_overall_exam_weekly` |
| 수술 | `mart_surgery_monthly` | `mart_surgery_daily` |

### 2-4. N:1 (한 화면 → 여러 마트 조합)

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

### 2-5. 아직 마트 없는 메뉴 (14개, `StatsPlaceholderPage` 표시)

`overseas` · `marketing` · `cancel-rate` · `no-show-rate` · `unit-price` · `dreamlens-revenue` · `staff-point` · `prp-rate` · `reoperation-rate` · `same-day-op` · `designated-doctor` · `visit-reason` · `daily-reception` · (`intake-conversion` 숨김)

### 2-6. 인프라 테이블 (메뉴 아님, 배치 지원용)

- `batch_run_log` — 배치 실행 이력 · 실패 원인 추적
- `batch_watermark` — 도메인별 마지막 배치 위치
- `reservation_stats_period_lock` — 월 확정 잠금 (배치 덮어쓰기 방어)
- `reservation_stats_override` — 예약통계 셀 수기 보정 (INSERT-only audit)

---

## 3. 배치가 마트에 쓰는 방식

### 3-1. 집계형 마트 (`mart_*`)

- 방식: `INSERT ... ON CONFLICT (yr, mo) DO UPDATE`
- 특성:
  - 매 실행마다 대상 월 전체를 원본에서 다시 COUNT/SUM → **값을 덮어쓰기** (누적 아님)
  - 소급 취소/보정도 다음 배치에서 자동 반영
  - 배치를 여러 번 돌려도 결과 동일 (멱등)

### 3-2. 리스트형 마트 (`list_*`)

- 방식: 대상 기간 `DELETE` → 그 기간 `INSERT`
- 특성:
  - 취소·삭제된 원본 행도 마트에서 자연 제거
  - PK 없이 원본 행 그대로 복제 (40+ 컬럼)

### 3-3. 잠금 (period_lock)

- 확정된 월(`reservation_stats_period_lock`에 등재된 `product_type, period`)은 배치가 자동으로 스킵
- 목적: 확정된 과거 월(예: 2024·2025 seed)이 배치 재계산으로 오염되지 않도록 방어
- 잠금은 마이그레이션 seed 스크립트에서 심음 (`V19__..._system_2026_h1_seed.sql`, `V20__..._cataract_2026_h1_seed.sql`)

### 3-4. min-year 가드

- `ReservationMartJob` 등은 기본 `minYear=2026`을 두고 그 미만 월을 무시
- 이유: 2024·2025는 원본 정의가 바뀌어 라이브 계산과 값이 달라짐 → V12 seed의 확정값을 SSOT로 고정
- 수동 재적재 API(`runManual`)로 우회 가능

---

## 4. 값을 바꾸고 싶을 때 어디를 손대야 하나

### 4-1. 원인별 정정 경로

| 원인 | 정정 경로 | 전파 범위 |
|---|---|---|
| 원본 데이터가 잘못 입력됨 (콜센터 오등록 등) | CRM 담당자에게 요청 → MSSQL 정정 → 다음 배치 자동 반영 | 전 지표 |
| 원본은 맞는데 이 화면 집계 정의에 특이 케이스 | 예약통계 화면에서 셀 수기 보정 (`reservation_stats_override`) | 그 화면만 |
| 특정 월 확정 후 배치 덮어쓰기 방지 | `reservation_stats_period_lock` 에 등재 | 배치 skip |
| 특정 기간을 강제 재계산 (소급 반영) | `POST /api/admin/batch/rerun?from&to&domain=...` | 지정 도메인 마트만 |

### 4-2. Override의 스코프 — 왜 자동 전파를 안 하는가

**의도적 설계**:
- `reservation_stats_override`는 "예약통계 이 셀만 특별한 이유로 다르게 표시" 용도
- 다른 도메인 마트(예약 종합·전환율 등)로 자동 전파하지 않음
- 근거: 도메인마다 집계 정의가 달라서 셀 1개의 의미가 다른 마트에서 1:1로 매핑되지 않음
  - 예: 예약통계 "TM_예약 +1" ≠ 예약 종합 "온라인 +1" (필터·경로 다름)
- Trade-off: **화면 간 불일치는 감수** ↔ **원본 정합성·이력 추적성 확보**

### 4-3. "화면에서 바꾼 걸 모든 지표에 반영"이 필요할 때

원본 수정이 유일한 근본 경로. 순서:
1. CRM 담당자에게 원본 정정 요청 → MSSQL 반영
2. 필요 시 관리자 API 로 해당 월 재적재 (`/api/admin/batch/rerun`)
3. 다음 03시 배치로 자동 갱신 (일반적 경우)

---

## 5. 프론트에서 계산이 있는 극소수 예외

원칙은 "프론트 = 렌더만"이지만 몇 가지 파생 계산은 존재:

1. **비율** — `달성률 = 실적/목표` 같은 A/B 형태는 프론트에서 나눗셈. 원료 A·B는 마트 그대로.
2. **주간 슬라이싱 SQL VIEW** — 월별 마트를 주별로 재슬라이싱하는 뷰가 일부 (SQL 안의 재계산이지 코드 계산은 아님).
3. **월간 레포트 종합 표** — 여러 마트 조회 결과를 프론트에서 표로 붙여 표시 (합산·나눗셈 없음, 배치 결과 그대로 나열).

---

## 6. 새 메뉴를 추가할 때 따라야 할 표준

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

## 7. FAQ

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

## 참조

- 배치 전략 원문: [`docs/databatch/strategy.md`](./strategy.md)
- 마트 DDL: `backend/src/main/resources/sql/mart/V*.sql`
- 배치 오케스트레이터: `backend/src/main/java/com/bviit/analytics/batch/BatchOrchestrator.java`
- 관리자 재적재 API: `backend/src/main/java/com/bviit/analytics/batch/admin/BatchAdminController.java`
