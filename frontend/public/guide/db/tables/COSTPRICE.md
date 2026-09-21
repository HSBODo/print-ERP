# COSTPRICE

> **DB**: SOFTCRM | **컬럼**: 31개 | **행 수**: ~853,077 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

수납/비용 테이블. 고객별 복수 행(CUST_NUM + SEQ)으로 수납 건별 금액·결제방법·카드사·수납 상태 등을 저장한다. `PrcItmLst` 테이블과 JOIN하여 수납 건의 세부 항목(수술비/검사비/PRP 등)을 PrcCod 기준으로 분류할 수 있다. B2B 정산, 통계, 해외마케팅 매출 등 비용 관련 거의 모든 화면에서 사용된다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | 고객번호 |
| PK | SEQ | int | 수납 순번 (고객 내 일련번호) |
| FK → CUSTOM | CUST_NUM | char(13) | CUSTOM.CUST_NUM |
| ← FK PrcItmLst | CUST_NUM + SEQ | | PrcItmLst.PrcCusNum + PrcItmLst.PrcSeq (수납 세부 항목) |
| JOIN | CUST_NUM + COST_DATE | | OPERATIONDATA.CUST_NUM + OPERATION_DATE (수술일 비용 매칭) |
| JOIN | CUST_NUM + SEQ | | CstDtlLst.CstCusNum + CstDtlLst.CstSeq (카드 결제 상세) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | 고객번호 | PK |
| SEQ | int | N | 수납 순번 | PK |
| COST_DATE | char(10) | Y | 수납일 (YYYY-MM-DD) | OPERATIONDATA.OPERATION_DATE와 JOIN 키 |
| COST_PRICE | money | Y | 총 수납 금액 | |
| COST_FLAG | nchar(10) | N | 수납 구분명 (진료명) | 프론트에서 `treatName`으로 표시 |
| COST_WAY | nvarchar(30) | Y | 결제 방법 (현금/카드/이체 등) | |
| COST_CARDCP | nvarchar(30) | Y | 카드사 | |
| COST_MEMO | nvarchar(100) | Y | 수납 메모 | |
| PayPrc | money | Y | 납부 금액 | |
| OsdPrc | money | Y | 미수 금액 | |
| OsdCod | char(3) | Y | 미수 코드 | |
| OsdCtt | nvarchar(50) | Y | 미수 내용 | |
| RfdCod | char(3) | Y | 환불 코드 | |
| RfdCtt | nvarchar(50) | Y | 환불 내용 | |
| PayStt | char(1) | Y | 수납 상태 | **'a' = 취소**. 비용 집계 시 반드시 `PayStt <> 'a'` 필터 |

> 외 16개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'COSTPRICE'` 으로 전체 조회

## 함정 (Gotchas)

- **[CRITICAL] 원데이 수술 검사비/수술비 합산 이슈**: 검사와 수술이 같은 날(원데이)인 경우, `COST_DATE = OPERATION_DATE` 조건으로 JOIN하면 검사비와 수술비가 모두 잡힌다. COSTPRICE 자체에는 수술비/검사비 구분 컬럼이 없으므로, **반드시 `PrcItmLst.PrcCod`로 분류**해야 정확한 분리가 가능하다.
- **[CRITICAL] 검사비/수술비 분리 TODO**: `PrcItmLst(PrcCod)` 우선 + COSTPRICE 폴백 방식으로 3곳 동시 적용 필요 (overseas-marketing-service, b2b-settlement, stats-weekly-report). `overseas-marketing-service.js`에는 이미 적용됨. 나머지는 미적용.
- **PayStt = 'a' 필터 필수**: 취소된 수납(`PayStt = 'a'`)은 반드시 제외해야 한다. 모든 비용 집계 쿼리에서 `WHERE PayStt <> 'a'` 또는 `PayStt != 'a'` 조건 필수.
- **PrcItmLst JOIN 패턴**: `COSTPRICE.CUST_NUM = PrcItmLst.PrcCusNum AND COSTPRICE.SEQ = PrcItmLst.PrcSeq`. 컬럼명이 다르므로 주의.
- **PrcCod 분류 체계** (B2B 정산 기준):

  | PrcCod | 구분 | 별칭 |
  |--------|------|------|
  | `'O'` | 수술비 | Op_Cost (날짜 제한 없음) |
  | `'33'` | 검사비 | Op_Cost1 |
  | `'D'` | DNA | Op_Cost2 |
  | `'Q','32'` | PRP | Op_Cost3 |
  | `'V'` | 기타/약 | Op_Cost4 |
  | `'z','Y','H'` | 노안 | Op_Cost5 |
  | `'U','3','1','K','2','7','8','9'` | 병원물품 | Op_Cost6 |

- **COST_DATE가 char(10)**: 날짜 비교 시 문자열 비교로 동작. `ISNULL` 가드 필요.
- **MAX(COST_DATE) 서브쿼리 패턴**: B2B 정산에서 가장 최근 수납일 기준으로 비용을 산출하는 패턴이 빈번. 날짜 제한 여부는 항목별로 다름 (수술비는 제한 없음, 나머지는 `COST_DATE <= OPERATION_DATE`).

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-etc-panels-service.js` | 고객 상세 — 수납이력 패널 (SEQ DESC 정렬) | R |
| `services/overseas-marketing-service.js` | 해외마케팅 수술비 동기화 (PrcItmLst 우선 + COSTPRICE 폴백) | R |
| `services/sp-memo-cache.js` | 수납 메모 캐시 | R |
| `routes/b2b-corp-settlement.js` | B2B 기업 정산 — 7개 비용 항목 산출 (`buildCostSubquery` DRY 패턴) | R |
| `routes/b2b-military-settlement.js` | B2B 군인 정산 — 동일 구조 | R |
| `routes/cataract-surgery-list.js` | 백내장 수술 목록 — 수술비 표시 | R |
| `routes/clinic-statistics.js` | 진료 통계 — PrcItmLst JOIN 비용 집계 | R |
| `routes/stats-weekly-report.js` | 주간 리포트 — 수술별 수가 (COSTPRICE + OPERATION_DATE JOIN) | R |
| `routes/stats-b2b-payment.js` | B2B 수가 통계 | R |
| `routes/referral.js` | 소개 환자 수납 금액 | R |
| `routes/vip.js` | VIP 수납 이력 | R |
| `routes/overseas-marketing.js` | 해외마케팅 매출 — COSTPRICE 직접 조회 | R |
| `routes/desk-card-payment-amount.js` | 카드 결제 금액 조회 (CstDtlLst JOIN) | R |
| `routes/dna-registration.js` | DNA 등록 — PrcItmLst JOIN 비용 확인 | R |
| `routes/dreamlens-*.js` | 드림렌즈 (검사배정/수가/직원소개) — PrcItmLst JOIN | R |
| `routes/exam-assignment.js` | 검사 배정 — PrcItmLst JOIN 비용 | R |
| `routes/customer-qa.js` | 고객 QA 전체 조회 | R |
| `routes/consult-statistics.js` | 상담 통계 — PrcItmLst JOIN | R |

### EyeChartPro Backend (Java)

| 파일 | 용도 | R/W |
|------|------|-----|
| `B2bRevenueStatsRepository.java` | B2B 매출 통계 — `buildCostSubquery` 동일 패턴 | R |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- [OPERATIONDATA.md](./OPERATIONDATA.md) — 수술 데이터 (COST_DATE = OPERATION_DATE JOIN)
- [CUSTOM.md](./CUSTOM.md) — 고객 마스터
- [PrcItmLst.md](./PrcItmLst.md) — 수납 세부 항목 (PrcCod 기준 비용 분류)

## 대표 조회 예시

```sql
-- 고객별 수납이력 (customer-etc-panels-service.js)
SELECT COST_DATE, PayStt AS State, COST_FLAG AS treatName,
       COST_WAY AS Cost_Way, COST_CARDCP AS CardCO, COST_PRICE AS Pay_Money
FROM COSTPRICE WITH(NOLOCK)
WHERE CUST_NUM = @custNum ORDER BY SEQ DESC

-- B2B 정산 — PrcItmLst JOIN으로 수술비 산출 (b2b-corp-settlement.js)
ISNULL((
  SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc)
  FROM COSTPRICE aa
  LEFT JOIN PrcItmLst pr ON aa.CUST_NUM = pr.PrcCusNum AND aa.SEQ = pr.prcseq
  WHERE aa.CUST_NUM = op.CUST_NUM AND aa.PayStt <> 'a'
    AND pr.PrcCod IN ('O') AND pr.PrcItmPrc <> 0
), 0) AS Op_Cost

-- 해외마케팅 수술비 동기화 — PrcItmLst 우선, COSTPRICE 폴백 (overseas-marketing-service.js)
UPDATE om SET om.surgery_cost = N'₩' + FORMAT(
  ISNULL(prc.surgery_total,
    ISNULL((SELECT SUM(cp2.COST_PRICE) FROM COSTPRICE cp2
      WHERE cp2.CUST_NUM = om.cust_num AND cp2.COST_PRICE > 0
        AND EXISTS (SELECT 1 FROM OPERATIONDATA o2
                    WHERE o2.CUST_NUM = cp2.CUST_NUM AND o2.OPERATION_DATE = cp2.COST_DATE)
    ), 0)
  ), 'N0')
FROM ECP_OverseasMarketing om
OUTER APPLY (
  SELECT SUM(pr.PrcItmQty * pr.PrcItmPrc) AS surgery_total
  FROM COSTPRICE cp JOIN PrcItmLst pr ON cp.CUST_NUM = pr.PrcCusNum AND cp.SEQ = pr.PrcSeq
  WHERE cp.CUST_NUM = om.cust_num AND pr.PrcCod = 'O' AND pr.PrcItmPrc != 0 AND cp.PayStt != 'a'
) prc
```
