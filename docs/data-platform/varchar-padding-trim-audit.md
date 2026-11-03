# warehouse `varchar` 공백 패딩 — TRIM 전수 조사

> 작성일: 2026-10-13 · 작성자: 대시보드 팀 · **최신화: 2026-10-13 (3차 재조사 — 숨은 함정 추가 없음 확정 · 양쪽/좌변 TRIM 분류 신설 · 인덱스 역할 매트릭스 신설)**
> 정본 전략: [`migration-strategy.md`](./migration-strategy.md) · 인덱스 요청: [`index-request.md`](./index-request.md) §7

## 1. 한 줄 요약

warehouse (`bnviit_datawarehouse`) 의 `raw.*` 테이블 varchar 컬럼이 **CRM 원본 `char(N)` 의 공백 패딩을 그대로 보존**해 저장되어 있다. Postgres `varchar` 비교는 trailing space 가 유의미하므로, 길이 다른 두 테이블 간 JOIN 또는 외부에서 trimmed 값을 넘기는 비교가 **조용히 매칭 실패**한다. MSSQL (운영 CRM) 에서는 `char` 끼리 padding-insensitive 비교라 보이지 않던 함정이 Postgres 포팅에서 드러났다.

## 2. 발견 경로

- 2026-10-13 로컬 수치 대조 중 **월간 레포트 "일반 고객 검사 (소개 제외)"** 가 운영 599·671·662·526·238 vs 로컬 1042·1185·1097·928·391 로 **일정하게 ~1.7배 과대**.
- `v_all_exam_list.intro_type` CASE 가 `ELSE '일반'` 라서 `motive_l` 가 빈 값인 행이 전부 "일반" 으로 쓸려 들어감.
- `motive_l` 빈 값 비율 2026-06: **1024/1075 (95%)** — `list_exam` 적재 시 `motive_new02` JOIN 전부 실패.
- 원인 추적 → `raw_crm_motive_new02.cust_num = varchar(23)` vs `raw_crm_exam.cust_num = varchar(13)` 패딩 길이 차이 → `WHERE m2.cust_num = e.cust_num` 매칭 실패.

## 3. raw 길이 지도 (문제 컬럼)

### 3.1 `cust_num` — 핵심 함정

| 길이 | 테이블 (11+2+2+2+2 = 19개) |
|---|---|
| **13** | `custom` · `exam` · `cataract_exam` · `operationdata` · `cataract_operationdata` · `reservation` · `reserve_history` · `costprice` · `lens` · `re_operation` · `custom_gender` |
| **20** | `custom_history` · `happytalk_mapping` |
| **23** | `motive_new01` · `motive_new02` |
| **50** | `pentacam_data` · `pentacam_topo` (+ ocr) |
| **200** | `casiadata` (+ ocr) |

### 3.2 다른 공통 JOIN 키 (안전 확인)

| 컬럼 | 길이 | 상태 |
|---|---|---|
| `reserve_num` | 13(costprice) / 22(reservation·reserve_history·assignlist·db_custom) | ⚠️ 길이 차이 있지만 **실제 JOIN 지점 없음** (costprice.reserve_num 과 reservation.reserve_num 간 비교 쿼리 전수 확인) |
| `prccusnum` / `cstcusnum` | 13 (prcitmlst, prcitmdtl, cstprcsub) | OK — costprice.cust_num (13) 과 매칭 |
| `happytalk_num` | 50 (양쪽) | OK |
| `emp_num` / `my_counselor` / `my_doctor` / `my_optometrist` / `operation_doc` / `counsel_doc` / `counsel_emp` | 전부 6 | OK |

### 3.3 데이터 매칭 컬럼 (JOIN 아님)

| 컬럼 | 길이 변동 | 영향 |
|---|---|---|
| `cust_name` | 50(costprice) / 100(여러) + **저장 패딩 일관성 없음** (`'이지은               '` len=17 vs `'염준영'` len=3) | OverseasMarketing `findCandidatesByNames` 영향 |
| `cust_ename` | 30 / 40 / 200 | 현재 JOIN/비교 쿼리 없음 → 영향 없음 |
| `call_num1/2/3` | 30 / 50 / 14 | 현재 JOIN/비교 쿼리 없음 (OverseasMarketing 전화 매칭은 Java 레벨 스트림 필터로 처리) |

## 4. 영향 범위 — 수치 왜곡 지표

| 지표 | 원인 리포 | 함정 지점 | 증상 |
|---|---|---|---|
| 월간 레포트 "일반 고객 검사 (소개 제외)" (`intro_general`) | `ExamList`·`CataractExamList`·`OverallExamListAggregator` | motive_new02 JOIN | 운영의 **1.7배 과대** |
| 소개 고객 (`intro_customer`) | 동일 | 동일 | 운영 대비 과소 (일반으로 쏠림) |
| 소개 직원 (`intro_staff`) | 동일 | 동일 | 운영 대비 과소 |
| 상담 성공률 분자 (`surgery_booked`) | `ConsultationRateBridge` | O 예약 요약 bridge | ✅ 수정 완료 (2026-10-13) |
| 수술 리스트 motive 분류 | `SurgeryList` | motive_new02 JOIN | 미확인 (수치 대조 전) |
| 외래 리스트 motive 분류 | `OutpatientList` | motive_new02 JOIN | 미확인 |
| 예약 리스트 motive 분류 | `ReservationList` | motive_new02 JOIN | 미확인 |
| B2B 매출 (백내장) | `B2bRevenueStats` | motive_new01 JOIN | 미확인 (B2B 분류 조건이 motive_l IN B2B\*) |
| OverseasMarketing `registeredDate` | `OverseasMarketingRepository.findCustomerDetails` | custom_history JOIN | 운영 전환 블로커 |
| OverseasMarketing 매칭 (고객번호·이름) | 동일 | `IN (:customerNos)` · `IN (:values)` | 운영 전환 시 매칭 전부 miss 가능 |

## 5. warehouse SQL 전수 조사 (73개)

### 5.1 조사 방법

1. raw 테이블 varchar 컬럼 길이 지도 완성 (information_schema.columns)
2. 같은 이름 다른 길이 컬럼 추출 → 44개 중 JOIN 키 7개 집중
3. `sql/warehouse/**/*.sql` 73개에서 "길이 다른 테이블 섞어 쓰는 SQL" 15개 추출
4. 각 파일 JOIN/WHERE 조건 수동 검토 → cust_num 비교 지점 전수 추출
5. 외부 param (`IN (:customerNos)` 등) 비교 전수 grep
6. 각 좌/우변 테이블·길이 재확인 → TRIM 필요 지점 확정

### 5.2 함정 아님 확인 (안전 확인)

#### cust_num/cust_name 외

- `call_num*` JOIN/IN — grep 결과 없음
- `cust_name` JOIN/IN — grep 결과 없음 (단 `customer-candidates.sql` predicate 치환으로 간접 비교 있음)
- `cust_ename` — 없음
- `reserve_num` 길이 함정 — 실제 JOIN 지점 없음
- `pentacam/casiadata` — warehouse SQL 참조 없음
- `exam-date-candidates.sql`·`surgery-date-candidates.sql` — reserve_date/operation_date (varchar 10) 끼리 비교 + 외부 `:values` 도 10자리 → OK
- `customer-stream.sql` — 전체 스트림 조회 + Java 레벨 필터 → OK
- `findCandidatesByPhoneOrEmail` — Java 레벨 매칭 → OK

#### 3차 재조사 — 숨은 함정 없음 확정 (2026-10-13)

- **`reserve_flag` 컬럼 간 비교 (4곳)**: `etc/select-dreamlens-ledger-draft.sql:15` · `outpatient/select-outpatient-list.sql:89` · `exam/select-cataract-exam-list.sql:152` · `exam/select-exam-list.sql:148` — 전부 `medical_sub_cfg(varchar 1) ↔ reservation(varchar 1)` 패턴. `reserve_history(30)` 와는 JOIN 참여 안 함 → 매칭 OK ✅
- **날짜 컬럼 간 비교 전수**: `exam_date` · `reserve_date` · `operation_date` · `cost_date` · `birth_day` · `first_day` · `last_day` · `reop_date` · `operationr_date` · `operationl_date` — CRM 테이블 전부 `varchar(10)` 통일. 매칭 OK ✅
  - 예외 1: `raw_homepage_tbl_counsel.reserve_date = varchar(20)` — homepage SQL 은 다른 raw 와 JOIN 안 함 (전수 확인)
  - 예외 2: `raw_crm_operation_accumulated_eye_count.operation_date = date 타입` — 이 테이블은 `cust_num = integer`, warehouse SQL 에서 다른 테이블과 JOIN 안 함
  - 예외 3: `raw_crm_pentacam_topo`·`casiadata.exam_date = date 타입` — warehouse SQL 참조 자체 없음
- **`emp_num` 계열** (my_counselor, my_doctor, my_optometrist, operation_doc, counsel_doc 등): 전부 varchar(6) → 매칭 OK
- **`happytalk_num`**: raw_crm_happytalk_mapping(50) ↔ raw_crm_happytalk_counsel_list(50) → 매칭 OK

## 6. 수정 지점 총 16곳 (재조사 2026-10-13)

> 초판 "13곳" 에서 재조사(§6.4) 로 **3곳 추가 발견** (b2b-cataract-surgery-rows·b2b-vision-surgery-rows SQL 2곳 + findCustomerByNo Java 1곳). False positive 는 없음 — 기존 13곳 전부 유효.

### 6.1 이미 패치됨 (2026-10-13 선제 수정)

| 파일 | 라인 | 패턴 |
|---|---|---|
| `sql/warehouse/consultation/select-o-reservation-summary-by-charts.sql` | 전체 | `WHERE TRIM(r.cust_num) IN (:chartNos)` · GROUP BY TRIM |
| `sql/warehouse/consultation/select-op-summary-by-charts.sql` | 전체 | 동일 |
| `sql/warehouse/exam/select-exam-list.sql` | 180 | `WHERE TRIM(m2.cust_num) = TRIM(e.cust_num)` |
| `sql/warehouse/exam/select-cataract-exam-list.sql` | 185 | `WHERE TRIM(m2.cust_num) = TRIM(CH.cust_num)` |

### 6.2 남은 수정 지점 (16개 — 승인 대기)

#### raw ↔ raw JOIN (10개)

| # | 파일 | 라인 | 길이 쌍 | 수정안 |
|---|---|---|---|---|
| 1 | `etc/select-b2b-cataract-exam-rows.sql` | 26 | motive_new01(23) ↔ cataract_exam(13) | `JOIN raw.raw_crm_motive_new01 mo ON TRIM(mo.cust_num) = TRIM(ex.cust_num)` |
| 2 | `exam/select-all-exam-list.sql` | 119 | motive_new02(23) ↔ fragment `cn` (13) | `WHERE TRIM(m2.cust_num) = TRIM(src.cn) AND m2.idx = '1'` |
| 3 | `exam/select-exam-count-by-class-monthly.sql` | 20 | motive_new02(23) ↔ `s.cn` (13) | `WHERE TRIM(m2.cust_num) = TRIM(s.cn) AND m2.idx = '1'` |
| 4 | `outpatient/select-outpatient-list.sql` | 104 | motive_new02(23) ↔ reservation(13) | `WHERE TRIM(m2.cust_num) = TRIM(rv.cust_num) AND m2.idx = '1'` |
| 5 | `overall/select-demographics-daily.sql` | 42 | motive_new02(23) ↔ `src.cn` (13) | `WHERE TRIM(m2.cust_num) = TRIM(src.cn) AND m2.idx = '1'` |
| 6 | `reservation/list/select-reservation-list.sql` | 134 | motive_new02(23) ↔ reservation(13) | `WHERE TRIM(m2.cust_num) = TRIM(r.cust_num) AND m2.idx = '1'` |
| 7 | `surgery/select-surgery-list.sql` | 239 | motive_new02(23) ↔ rows_cte(13) | `WHERE TRIM(m2.cust_num) = TRIM(rows_cte.cust_num) AND m2.idx = '1'` |
| 8 | `marketing/customer-details.sql` | 38 | custom_history(20) ↔ custom(13) | `WHERE TRIM(cust_num) = TRIM(c.cust_num)` |
| **14** | `etc/select-b2b-cataract-surgery-rows.sql` | 34 | motive subquery(23) ↔ cataract_operationdata(13) | `ON TRIM(mo.cust_num) = TRIM(op.cust_num)` — `__MOTIVE_SUBQUERY__` 치환본이 motive_new01/02 (23) 라 operationdata (13) 와 매칭 실패 |
| **15** | `etc/select-b2b-vision-surgery-rows.sql` | 29 | motive subquery(23) ↔ operationdata(13) | `ON TRIM(mo.cust_num) = TRIM(op.cust_num)` — 동일 패턴 |

#### 외부 param IN (4개)

| # | 파일 | 라인 | 수정안 |
|---|---|---|---|
| 9 | `marketing/price-item-costs.sql` | 18 | `WHERE TRIM(cp.cust_num) IN (:customerNos)` |
| 10 | `marketing/customer-details.sql` | 81 | `WHERE TRIM(c.cust_num) IN (:customerNos)` |
| 11 | `marketing/outpatient-enrichment.sql` | 16 | `AND TRIM(r.cust_num) IN (:customerNos)` |
| 12 | `marketing/fallback-costs.sql` | 18 | `WHERE TRIM(cp.cust_num) IN (:customerNos)` |

#### Java predicate 치환 (2개)

| # | 지점 | 수정안 |
|---|---|---|
| 13 | `OverseasMarketingRepository.findCandidatesByNames:123` | predicate 를 `"TRIM(c.CUST_NAME) IN (:values)"` 로 변경 (`customer-candidates.sql` 의 `%s` 로 치환됨 · `cust_name` 패딩 일관성 없음) |
| **16** | `OverseasMarketingRepository.findCustomerByNo:336` | predicate 를 `"TRIM(c.CUST_NUM) IN (:values)"` 로 변경 (동일 치환본에 cust_num IN. #13 와 같은 메서드 재사용) |

### 6.3 전제 (재검증 2026-10-13 — 확정됨 ✅)

- `OverseasMarketingController:161` `request.getOrDefault("customerNo", "").trim()` 로 **입력 시 trim**
- `Controller:142` `matches("[0-9]{1,20}")` 로 숫자만 허용 (공백 없음 강제)
- `OverseasMarketingCrmEnricher:39` `Set<String> customerNos` — 전부 trimmed
- `OverseasMarketingRepository` `findCustomerDetails`/`findOutpatientVisits`/`findPriceItemCosts`/`findFallbackCosts` 전부 trimmed `List<String>` 전달
- → **Java 쪽은 trimmed 값 넘김 확정**. SQL 쪽 TRIM 만 걸면 OK (Java 추가 수정 불필요)

### 6.4 재조사 결과 (2026-10-13)

#### 추가 발견 (3곳)

위 표의 **#14 · #15 · #16**. `__MOTIVE_SUBQUERY__` placeholder 치환본이 motive_new01/02(23) 기반이라 operationdata(13)와 매칭 실패. b2b 매출(수술 쪽) 리포가 전부 영향.

#### False positive 확인 — 없음 (기존 13곳 전부 유효)

재검증한 지점:
- `consultation/select-monthly-vision-rates.sql:41` — `mo` 는 operationdata 서브쿼리 (13 ↔ exam 13) · 함정 아님
- `consultation/select-monthly-cataract-rates.sql` — motive 참조 없음
- `marketing/customer-details.sql:50/57/66` — 서브쿼리 FROM 전부 reservation/operationdata (13) · 함정 아님
- `marketing/outpatient-enrichment.sql:38/42` — costprice(13) ↔ visit_dates CTE (reservation 13 뿌리) · 함정 아님

#### 전수 조사 범위

- warehouse SQL cust_num 비교 지점: **150라인** (grep 전수)
- 각 라인 좌/우변 테이블 길이 분류 → 함정 지점 추출
- Java 치환 패턴 (`formatted()` + `%s`): `OverseasMarketingRepository:194` 유일
- 외부 IN 패턴 (`:customerNos`, `:values`): SmsCrm(이미 TRIM) + ConsultationBridge(이미 TRIM) + Marketing 4곳 + Java 치환 2곳 — 외 없음

### 6.5 양쪽 TRIM vs 좌변 TRIM 분류 (3차 재조사 2026-10-13)

인덱스 전략에 직결 — "양쪽 TRIM" 은 양쪽 테이블 모두 표현식 인덱스 필요, "좌변만" 은 좌변 테이블만.

#### raw ↔ raw JOIN (양쪽 TRIM 필수 — 양쪽 인덱스 필요)

| # | 좌변 (라이트) | 우변 | 양쪽 인덱스 필요 |
|---|---|---|---|
| 1 | motive_new01 (23) | cataract_exam (13) | motive_new01 + cataract_exam |
| 2 | motive_new02 (23) | fragment `src.cn` = exam/custom (13) | motive_new02 + exam + custom |
| 3 | motive_new02 (23) | fragment `s.cn` = exam/custom (13) | motive_new02 + exam + custom |
| 4 | motive_new02 (23) | reservation (13) | motive_new02 + reservation |
| 5 | motive_new02 (23) | fragment `src.cn` = exam/custom (13) | motive_new02 + exam + custom |
| 6 | motive_new02 (23) | reservation (13) | motive_new02 + reservation |
| 7 | motive_new02 (23) | rows_cte (operationdata 13 뿌리) | motive_new02 + operationdata |
| 8 | custom_history (20) | custom (13) | custom_history + custom |
| 14 | motive subquery = motive_new01/02 (23) | cataract_operationdata (13) | motive_new01 + motive_new02 + cataract_operationdata |
| 15 | motive subquery = motive_new01/02 (23) | operationdata (13) | motive_new01 + motive_new02 + operationdata |

#### 외부 IN (좌변만 TRIM — 좌변 인덱스만 필요)

| # | 좌변 테이블 | 우변 (Java bind) | 좌변 인덱스 |
|---|---|---|---|
| 9 | costprice (13) | `:customerNos` (Java trimmed) | costprice |
| 10 | custom (13) | `:customerNos` | custom |
| 11 | reservation (13) | `:customerNos` | reservation |
| 12 | costprice (13) | `:customerNos` | costprice |
| 13 (Java) | custom.cust_name | `:values` (Java trimmed) | custom (cust_name) |
| 16 (Java) | custom.cust_num | `:values` (Java trimmed) | custom (cust_num) |

**주의**: 좌변만 TRIM 하면 표현식 인덱스가 좌변에만 있어도 index scan 가능. 양쪽 모두 걸면 안전하지만 불필요.

## 7. 왜 MSSQL 운영에선 안 보였나

ANSI SQL-92 는 두 문자열 비교 시 짧은 쪽에 공백을 패딩해 비교 (padding-insensitive comparison). MSSQL 은 이 표준을 따른다. Postgres 는 이 규칙을 `char(N)` 에만 적용하고 **`varchar` 에는 trailing space 를 유의미하게 다룬다**.

| 비교 | MSSQL | Postgres |
|---|---|---|
| `char(13) '100274       '` vs `'100274'` | ✅ TRUE | ✅ TRUE (char 는 Postgres 도 pad) |
| `varchar(13) '100274       '` vs `'100274'` | ✅ TRUE (SQL-92) | ❌ FALSE (trailing space 유의미) |

운영 CRM 은 `RESERVATION.CUST_NUM` 이 `char(13)` → MSSQL 자동 pad 비교. 데이터 플랫폼이 `varchar(13)` 로 복사하면서 저장 데이터(공백 패딩) 는 그대로 → Postgres varchar 비교 규칙상 매칭 실패.

## 8. 성능 영향

TRIM 은 **일반 B-tree 인덱스를 못 탐** (함수 적용 표현식). raw 쪽에 **표현식 인덱스** 가 없으면 full scan.

- 현재: raw 쪽 cust_num 표현식 인덱스 없음 → **TRIM 추가하면 전부 seq scan**
- 큰 테이블 (reservation 6.9M, exam, surgery) 과 JOIN 하면 분 단위 소요
- 특히 `OverallMart.demographics_daily` 매일 돌면 배치 전체 지연 가능
- `ReservationList` (A6, 이미 1일 6분 19초) 가 더 느려짐

## 9. 데이터 플랫폼 팀 요청 (재조사로 요청 범위 축소)

[`index-request.md`](./index-request.md) §7 요청서 — 초판 "17개 테이블" 에서 **실제 사용 테이블 11개로 축소**.

### 9.1 필수 TRIM 표현식 인덱스 (11개)

#### `cust_num` TRIM 인덱스 (10개)

```sql
-- raw ↔ raw JOIN 양쪽 (양쪽 테이블 모두 인덱스 필요)
CREATE INDEX IF NOT EXISTS idx_raw_crm_custom_cust_num_trim                   ON raw.raw_crm_custom                   ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_exam_cust_num_trim                     ON raw.raw_crm_exam                     ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_cataract_exam_cust_num_trim            ON raw.raw_crm_cataract_exam            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_operationdata_cust_num_trim            ON raw.raw_crm_operationdata            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_cataract_operationdata_cust_num_trim   ON raw.raw_crm_cataract_operationdata   ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_reservation_cust_num_trim              ON raw.raw_crm_reservation              ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_motive_new01_cust_num_trim             ON raw.raw_crm_motive_new01             ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_motive_new02_cust_num_trim             ON raw.raw_crm_motive_new02             ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_custom_history_cust_num_trim           ON raw.raw_crm_custom_history           ((TRIM(cust_num)));

-- 외부 IN (:customerNos) 전용 (좌변만 TRIM, 우변은 Java 가 trimmed 로 넘김)
CREATE INDEX IF NOT EXISTS idx_raw_crm_costprice_cust_num_trim                ON raw.raw_crm_costprice                ((TRIM(cust_num)));
```

#### `cust_name` TRIM 인덱스 (1개)

```sql
-- OverseasMarketingRepository.findCandidatesByNames · cust_name 패딩 일관성 없음
CREATE INDEX IF NOT EXISTS idx_raw_crm_custom_cust_name_trim                  ON raw.raw_crm_custom                   ((TRIM(cust_name)));
```

### 9.2 TRIM 인덱스 불필요 (초판에서 제외)

| 테이블 | 제외 사유 |
|---|---|
| `raw_crm_reserve_history` | cust_num JOIN 지점 없음 (happytalk 쪽은 happytalk_num 로 조인) |
| `raw_crm_lens` | `customer-details.sql:78` `l.cust_num=c.cust_num` 둘 다 13 → TRIM 자체 불필요 |
| `raw_crm_re_operation` | cust_num 비교 없음 |
| `raw_crm_custom_gender` | 파생 테이블, warehouse SQL 참조 없음 |
| `raw_crm_happytalk_mapping` | happytalk_num 로만 조인 (cust_num 비교 없음) |
| `raw_crm_pentacam_data/topo` | warehouse SQL 참조 없음 |
| `raw_crm_casiadata` | warehouse SQL 참조 없음 |

### 9.3 선택지 (대안 비교)

| | 접근 | 범위 | 비고 |
|---|---|---|---|
| **A** | §9.1 11개 표현식 인덱스 추가 | 11개 테이블 | **지금 전제** · 데이터 플랫폼 "인덱스 추가 외 변경 불가" 제약 수용 |
| **B** | raw 적재 시 varchar `cust_num`/`cust_name` 전부 `RTRIM` 재적재 | 전체 재적재 | 가장 깔끔 — 우리 쪽 TRIM 전부 제거 가능. 데이터 플랫폼 쪽 가능 여부 미확인 (현재는 불가 전제) |

A 로 진행 중. 데이터 플랫폼이 B 수용 시 §6 의 TRIM 수정 전부 롤백 가능.

### 9.4 인덱스 테이블별 역할 매트릭스 (3차 재조사 2026-10-13)

각 테이블이 양쪽 JOIN 참여인지, 외부 IN 전용인지, 둘 다인지에 따라 인덱스 활용 패턴이 다름.

| 테이블 | 컬럼 | 역할 | 사용 지점 | index scan 대상 |
|---|---|---|---|---|
| `raw_crm_custom` | cust_num | **양쪽 + 좌변** | #8 JOIN + #10 외부 IN + #16 Java | JOIN 양쪽 중 하나 + 외부 IN 좌변 |
| `raw_crm_custom` | cust_name | **좌변만** | #13 Java | 외부 IN 좌변 |
| `raw_crm_exam` | cust_num | **양쪽** | #2·#3·#5 (fragment 뿌리) | JOIN 양쪽 중 하나 |
| `raw_crm_cataract_exam` | cust_num | **양쪽** | #1 JOIN | JOIN 양쪽 중 하나 |
| `raw_crm_operationdata` | cust_num | **양쪽** | #7 (rows_cte 뿌리) + #15 | JOIN 양쪽 중 하나 |
| `raw_crm_cataract_operationdata` | cust_num | **양쪽** | #14 JOIN | JOIN 양쪽 중 하나 |
| `raw_crm_reservation` | cust_num | **양쪽 + 좌변** | #4·#6 JOIN + #11 외부 IN | JOIN 양쪽 + 외부 IN 좌변 |
| `raw_crm_costprice` | cust_num | **좌변만** | #9·#12 외부 IN | 외부 IN 좌변 |
| `raw_crm_motive_new01` | cust_num | **양쪽** | #1 JOIN + #14·#15 (subquery 뿌리) | JOIN 양쪽 중 하나 |
| `raw_crm_motive_new02` | cust_num | **양쪽** | #2~#7 JOIN + #14·#15 (subquery 뿌리) | JOIN 양쪽 중 하나 |
| `raw_crm_custom_history` | cust_num | **양쪽** | #8 JOIN | JOIN 양쪽 중 하나 |

**해석**:
- **"양쪽"** 역할 테이블 (9개): JOIN 참여 — 양쪽 TRIM 쿼리 `TRIM(a.cust_num) = TRIM(b.cust_num)` 가 쿼리 플래너에 의해 nested loop / hash join 선택. 선택 알고리즘에 따라 어느 한쪽 또는 양쪽 TRIM 인덱스가 활용됨. 양쪽 다 있는 편이 planner 자유도 높아 안전
- **"좌변만"** 역할 테이블 (costprice 1개 + custom cust_name): 외부 IN 전용 — 좌변 TRIM 인덱스만 있으면 index scan. 양쪽 인덱스 불필요
- **"양쪽 + 좌변"** 역할 테이블 (custom cust_num, reservation): JOIN·외부 IN 모두 참여 — 인덱스 1개가 두 용도 동시 커버

## 10. 적용 전략 선택지

| | 전략 | 비고 |
|---|---|---|
| **a** | 16곳 전부 지금 적용 | 깔끔. 성능은 §9 반영까지 감수. 수치 정합성 검증 재개 가능 |
| **b** | 단계 분할 — 월간레포트 수치 대조 우선(1~7 + #5 + #14 + #15 b2b), marketing (#8~13 + #16) 은 OverseasMarketing 운영 전환 전 적용 | 긴급도 분리. 중간 상태 유지보수 혼란 가능 |

## 11. 검증 방법

### 11.1 수정 후 재배치

```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.localdb.yml up -d --build

# EXAM → OVERALL → CONSULTATION 순
curl -X POST "http://localhost:18080/api/admin/batch/rerun?from=2026-06-01&to=2026-10-12&domain=EXAM"       -H "Authorization: Bearer $TOKEN"
curl -X POST "http://localhost:18080/api/admin/batch/rerun?from=2026-06-01&to=2026-10-12&domain=OVERALL"    -H "Authorization: Bearer $TOKEN"
curl -X POST "http://localhost:18080/api/admin/batch/rerun?from=2026-06-01&to=2026-10-12&domain=CONSULTATION" -H "Authorization: Bearer $TOKEN"
```

### 11.2 비교 쿼리

```bash
docker compose -f docker-compose.localdb.yml exec -T postgres psql -U analytics -d analytics -c \
  "SELECT yr, mo, intro_general, intro_customer, intro_staff
   FROM mart_overall_exam_monthly WHERE yr=2026 AND mo>=6 ORDER BY mo;"
```

### 11.3 기대값 (운영 대조)

| 월 | 운영 intro_general | 로컬 기대 |
|---|---|---|
| 2026-06 | 599 | ±5% 이내 |
| 2026-07 | 671 | ±5% 이내 |
| 2026-08 | 662 | ±5% 이내 |
| 2026-09 | 526 | ±5% 이내 |
| 2026-10 | 238 | ±5% 이내 |

소개 쪽(`intro_customer`·`intro_staff`) 은 역으로 올라감.

## 12. 추적성

- 발견: 2026-10-13 월간 레포트 수치 대조
- 1차 긴급 패치: 4곳 (ConsultationBridge 2 + ExamList 2)
- 1차 전수 조사: 13곳 식별 (문서 초판)
- 2차 재조사 (2026-10-13 심야): 150라인 cust_num 비교 전수 재grep + Java 치환 패턴 전수 → **+3곳 (#14·#15·#16)**, False positive 0곳. 최종 **16곳**
- **3차 재조사 (2026-10-13 심야+1)**: 숨은 함정 추가 조사 (date/flag/state 등 다른 varchar JOIN) → **추가 함정 0곳** 확정. 양쪽 TRIM vs 좌변 TRIM 분류 (§6.5) · 인덱스 테이블별 역할 매트릭스 (§9.4) 신설
- 데이터 플랫폼 요청: `index-request.md` §7 (2026-10-13 추가 후 11개 테이블로 축소)
- 다음 단계: 사용자 승인 → 16곳 전부 또는 단계 분할 적용 → 재배치 → 수치 재검증
