# 회계 도메인 — 마트·배치·API 정본

작성일: 2026-09-15 · 원형: `C:\workspace\디렉팅\회계` (index.html + `_build-data.js` · `_build-monthly.js` · `_build-crm.js` · `_smoke-test.js`)

회계 5개 화면(진료 수납 · 시력교정 매출 내역 · 시력교정 매출 집계 · 시력교정 매출 그래프 · 진료 매출 그래프)은
**원형 프로토타입(정적 HTML + 추출 스냅샷 JS)** 의 규칙을 그대로 Postgres 마트 + `/api/accounting` 으로 옮긴 것이다.
숫자 규칙(순액 공식 · 항목 매핑 · 취소 상계 · 과세 항목 · 매입사 환산)은 원형과 1:1 이며, 달라진 것은 데이터 위치뿐이다.

## 1. 원천과 마트

| 마트 | V | 원천 | 범위 | 적재 방식 |
|---|---|---|---|---|
| `list_medical_receipt` | V67a | 의사랑 IPLUS `PAOSUNAB_New`(외래) + `PAISUNAB_New`(입원) + `PAYTRANS` + `NHICM4AP` + `RECEIPTCASH` — `sql/iplus/accounting/select-medical-receipts-inner.sql` | 2026-01-01~ (_New 체계) | 요청 범위가 걸친 월 전체 delete+insert (자연키 없음 · `row_seq` = 배치 내 순번) |
| `mart_medical_receipt_monthly` | V67b | 의사랑 구/신 원장 + `PAYTRANS` + `NHICM4AP` 월합 — `select-medical-monthly-inner.sql` | 2023~ | (yr, mo) upsert · from..to 가 걸친 달 통째로 재계산 |
| `list_vision_receipt` | V67c | SOFTCRM `CstPrcSub` + `PrcItmDtl`/`PrcItmLst` + `OPERATIONDATA` + `COSTPRICE`·`CUSTOM`·`EMPLOYEE` — `sql/softcrm/accounting/select-vision-*.sql` | 2023-01-01~ | 수납일 범위 delete+insert · 취소 전표는 원행 + 취소행(음수) |

### 의사랑(IPLUS) 접근 — OPENQUERY

의사랑 EMR 은 운영 MSSQL(SOFTCRM) 의 링크드서버 `[220.85.109.240]` 로만 닿는다. 상관 서브쿼리가 많은 원장 조회는
4부 이름보다 `OPENQUERY`(원격 실행) 가 훨씬 빠르므로 원형과 같이 OPENQUERY 를 쓴다.

- 안쪽 쿼리는 `sql/iplus/accounting/*-inner.sql` 에 **주석 달린 원문** 으로 둔다.
- `common/util/OpenQuerySql.wrapForIplus(inner, from, to)` 가 `--` 주석 제거 → 공백 축약 → `__OQ_FROM__/__OQ_TO__` 치환(ISO 재검증)
  → 8,000자 상한 검증 → `'`→`''` 이스케이프 → `SELECT * FROM OPENQUERY([220.85.109.240], '...')` 로 감싼다.
- 현재 원장 쿼리는 약 6,900자 — 컬럼을 늘릴 때 상한을 의식할 것(`OpenQuerySqlTest` 가 리소스 길이를 검증한다).
- 링크드서버 장애 시 조회 전체가 실패하므로 `MedicalReceiptImportService` 가 `REQUIRES_NEW` + try/catch 로 격리한다.
  실패하면 시력교정 적재는 커밋하지만 성공 기준일은 갱신하지 않는다. `batch_run_log`는 `FAILED`,
  `table_stats`에는 완료된 적재 건수와 `list_medical_receipt_failed=1`이 남고 실패 알림을 보낸다.

## 2. 숫자 규칙 (원형과 동일)

### 진료 수납 (의사랑)

- **실수납합계**(화면 합계행 · 2026~ 그래프) = 일련번호 98(환불금) 이면 `−환불액`, 아니면 `실수납액 + 미수회수`.
  총본인부담에서 역산하면 취소·재발행 이력이 얽힌 영수증에서 어긋나 실수납액 기준을 쓴다.
- **월집계 순액**(`mart_medical_receipt_monthly.net` · 2023~2025 그래프 · 연도 비교) = 레거시 공식
  `수납할금액 + 미수회수(91·92·93) − 미수발생(90) − 환불금(81·82) − 건생비(NHICM4AP) + 환불발생(80·진료일자)`.
- 보험유형: 일련번호 99 = 미수입금, 98 = 환불금, 그 외 `SETKIND.KINDNAME`.
- 매출구분: 입원 원장은 `입원`, 외래는 진료실이 없거나 '백내장' 이면 `입원외`, 아니면 `기타외래`. 화면의 **백내장** 탭 = 매출구분 입원·입원외.
- 카드/현금/통장수납(화면) = 원장 값 + 미수카드/현금/통장(91/92/93) 회수분.

### 시력교정 매출 (SOFTCRM 비급여)

- 행 1개 = `CstPrcSub` 1줄(결제수단별 전표 상세). 분할결제는 결제수단마다 한 행.
- 항목 금액: `PrcItmDtl`(결제수단별 배분) 우선, 없으면 분할이 아닌 전표에 한해 `PrcItmLst`(수납 단위) 폴백.
  **항목합 ≡ 수납금액** 불변식 — 합이 0 이면 전액 미분류, 어긋나면 비율 보정 후 남는 원을 최대 항목에 붙인다.
- `PrcCod → 진료명` 매핑과 과세 7종(올코드라이아이·올코어아레즈투·올코어vitc·Dr.PNT·올코어유산균·글라우포뮬러·플로터포뮬러)은
  `accounting/service/VisionItemCatalog`. 매핑에 없는 코드는 `미분류` 로 싣고 배치 로그에 `unmapped PrcCod` 로 경고한다.
- 취소 전표(`CstCnlYnN='Y'`): 원행(결제처리, +, 등록일시=`CstRegDte`) + 취소행(결제취소, −, 등록일시=`CstModDte`). 합계는 순액.
- 매입사 = `CstMaeNam` → 없으면 `CstCrdCpn` 코드 환산(01 국민 … 23 제로페이) → 별칭(위챗페이·알리페이 → 나이스정보통신).
- 수납모드 = 승인번호(`CstPmsNum`) 있으면 단말기, 없으면 수동. 수술 정보 = 수납일과 가장 가까운 `OPERATIONDATA` 1건.
- 결제수단 버킷(집계·필터) = `수납방법 = '카드'` 만 카드, 나머지(현금·현금영수·통장 …)는 **현금** 한 칸.

## 3. 배치

- 도메인 `BatchOrchestrator.Domain.ACCOUNTING` → `batch/job/AccountingMartJob`. 범위 = **수납일**.
- 순서: 시력교정(SOFTCRM 직결, 이 트랜잭션) → 진료 수납(의사랑, REQUIRES_NEW 격리) → `batch_watermark(accounting)`.
- 자동: 매일 03:00 D-1 · 매월 1일 03:30 전월. 진료 수납은 하루 요청도 그 달 전체 행·집계를 함께 갱신한다.
- 월별 보정 후 회계만 `reconcile-accounting-history`로 2023-01부터 전전월까지 다시 조회한다.
  월 단위로 커밋하고 하나의 실행 로그·알림으로 합친다. 오래된 취소·정정·물리 삭제는 다음 월별 보정에서 반영된다.
  회계의 원천 전표 재검산에만 적용하는 예외이며 다른 도메인의 `min-year` 확정값 보호는 유지한다.
- 진료 월 집계는 조회 결과가 빈 달도 0으로 upsert한다. 2026년 이후는 해당 월 전체 행 교체와
  `rows_complete=true` 저장을 같은 트랜잭션으로 처리한다. 실패하면 기존 행·집계·완료 표시는 모두 보존된다.
- 초기 백필(관리자 화면 "회계 도메인만"): 시력교정 2023-01~, 진료 월집계 2023-01~(행은 2026-01 부터 실림). **월 단위로 나눠** 돌린다 —
  의사랑 원장 쿼리는 상관 서브쿼리가 많아 한 해를 한 번에 읽으면 길다.
- 관측: `table_stats` 에 `list_vision_receipt` · `vision_no_item` · `vision_ratio_adjusted` · `mart_medical_receipt_monthly` ·
  `list_medical_receipt` (· `list_medical_receipt_failed`).

## 4. API (`/api/accounting` · ADMIN · `SecurityConfig`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/medical-receipts?from&to` | 진료 수납 행 (≤366일). 화면이 필터·정렬·합계를 클라이언트에서 한다. |
| GET | `/medical-receipts/monthly?years=&category=` | 진료 월별. `rows_complete=true`인 월은 행 재집계(구분 필터 가능), 나머지 월은 집계 마트('전체'만). 빈 완료 월은 0. |
| GET | `/vision-receipts?from&to` | 시력교정 매출 행 (`itemAmounts` JSON 객체 포함). 매출 집계(피벗) 화면도 이 행을 접는다. |
| GET | `/vision-receipts/monthly?years=` | 시력교정 월별 — 건수는 취소행 포함 행수, 금액은 순액. |
| GET | `/status` | 적재 현황 — 화면 "데이터 기준 YYYY-MM-DD · from~to" 와 그래프 연도 후보. |

마트 프로파일이 꺼진 환경(local 단독)은 503. 응답 키는 프런트 `api/accounting/types.ts` 와 1:1.

## 5. 원형과 의도적으로 다른 점

- 시력교정 2023~2025 를 원형은 브라우저 용량 때문에 월집계만 남겼지만, 마트는 4년치 행(약 15만)을 모두 싣고 월별·피벗은 GROUP BY/화면 집계로 만든다.
  원형 스모크테스트가 "행 경로 = 집계 경로" 를 보장하므로 숫자는 같다.
- 진료 매출 그래프의 2026 연도 비교 모드: 원형은 월집계(레거시 순액)를 썼지만, 여기서는 월 전체 행 적재가 완료된 월은 행 재집계(실수납합계)를 쓴다 —
  단일/비교 모드에서 같은 해가 다른 숫자로 보이지 않게 하기 위해서다. 2023~2025 는 월집계뿐이라 원형과 동일.
- "데이터 기준" 은 스냅샷 생성일 대신 마트 최종 적재일(`/status`) 을 쓴다.

## 6. 검증

- 단위: `OpenQuerySqlTest` · `VisionReceiptAssemblerTest`(항목합 불변식·취소행·폴백·비율 보정·매입사·최근 수술) ·
  `MedicalMonthlyFolderTest`(2026-07 운영 실측 조각) · `AccountingMartJobTest`(의사랑 실패 격리) · `AccountingSqlResourceTest`.
- 통합: `AccountingControllerIntegrationTest`(401/403/503/400).
- PostgreSQL: `AccountingMartIntegrityIT`(부분 적재 폴백·빈 달 초기화·실패 롤백·상태 null·실패 이력·V68 마이그레이션).
- 스케줄러: `AccountingBatchOrchestrationTest`(2023~ 월별 이력 보정·부분 실패 기록·배치 비활성).
- 운영 대조: 2026-07 의사랑 원장 5,290+45건 · 시력교정 전표 3,033건(취소 93) — 원형 스냅샷(08-27/28 기준 5,334행 · 3,126행)과 이후 입력분만큼 차이.

## 7. 정합성 수정 적용 시

- 앱 기동 시 V68이 기존 월 집계에 `rows_complete BOOLEAN DEFAULT FALSE`를 추가한다. 기존 금액은 유지한다.
- 기존 행의 월 전체 적재 여부는 증명할 수 없으므로, 월별 보정 전에는 '전체' 그래프에 월 집계값을 사용한다.
  외래·입원·백내장 그래프는 완료 표시가 있는 월만 반환한다.
- 배포 직후 구분 그래프까지 사용하려면 관리자 회계 배치로 2026년 이후 필요한 월을 월 단위 재적재한다.
  정기 월별 보정에서도 자동 전환된다. 진료 수납 내역 조회는 기존 행을 계속 반환한다.
