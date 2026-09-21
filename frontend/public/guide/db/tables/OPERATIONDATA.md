# OPERATIONDATA

> **DB**: SOFTCRM | **컬럼**: 84개 | **행 수**: ~304,087 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

시력교정 수술 정보 테이블. 고객별 1행(CUST_NUM = PK)으로, 수술일·수술 방법(좌/우)·수술의·집도 스태프·수술 전 측정값(좌/우 각 9항목) 등을 저장한다. 백내장 수술은 별도 테이블 `Cataract_Operationdata`(144컬럼)에서 관리하며, 두 테이블을 UNION하여 전체 수술 통계를 산출한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | 고객번호 (1인 1행) |
| FK → CUSTOM | CUST_NUM | char(13) | CUSTOM.CUST_NUM |
| FK → EMPLOYEE | OPERATION_DOC | char(6) | EMPLOYEE.EMP_NUM (수술의) |
| FK → EMPLOYEE | OPERATION_FLAB | char(6) | EMPLOYEE.EMP_NUM (플랩 담당) |
| FK → EMPLOYEE | OP_EMP1 | char(6) | EMPLOYEE.EMP_NUM (O담당) |
| FK → EMPLOYEE | OP_EMP2 | char(6) | EMPLOYEE.EMP_NUM (C담당 — 레거시 순서 주의) |
| FK → EMPLOYEE | OP_EMP3 | char(6) | EMPLOYEE.EMP_NUM (A담당) |
| JOIN | CUST_NUM + OPERATION_DATE | | COSTPRICE.CUST_NUM + COST_DATE 매칭 (수술일 비용 산출) |
| JOIN | CUST_NUM | | RESERVATION.CUST_NUM (예약 → 수술 조회) |
| JOIN | CUST_NUM | | MOTIVE_NEW01.CUST_NUM (소개자 → 수술 여부 확인) |
| ← FK | CUST_NUM | | OPERATIONDATA_MEMO (수술 메모 확장 테이블) |

## 핵심 컬럼 (상위 15개)

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | 고객번호 | PK |
| OPERATION_DATE | char(10) | Y | 수술일 (YYYY-MM-DD) | COSTPRICE.COST_DATE와 JOIN 키 |
| OPERATIONR | nvarchar(40) | Y | 우안 수술 방법 (라식/라섹/스마일 등) | |
| OPERATIONL | nvarchar(40) | Y | 좌안 수술 방법 | |
| OPERATION_DOC | char(6) | Y | 수술의 (EMPLOYEE.EMP_NUM) | |
| OPERATION_FLAB | char(6) | Y | 플랩 담당의 (EMPLOYEE.EMP_NUM) | |
| OP_EMP1 | char(6) | Y | O담당 직원 | 레거시 순서: EMP1=O, EMP3=A, EMP2=C |
| OP_EMP2 | char(6) | Y | C담당 직원 | **주의**: 직관적 순서와 다름 |
| OP_EMP3 | char(6) | Y | A담당 직원 | |
| TODAY_YN | char(1) | Y | 당일수술(원데이) 여부 ('Y'/'') | |
| REOP_Impossible | nchar(1) | Y | 재수술 불가 여부 ('Y'/'') | |
| PRP | nchar(1) | Y | PRP 시술 여부 ('Y'/'') | |
| OPCARD_YN | char(1) | Y | 수술확인서 발급 여부 ('Y'/'') | |
| RIGHT01~RIGHT09 | nvarchar(20) | Y | 우안 측정값 (근시/난시/축/BCVA/동공/안압/K값/각막두께/절삭깊이) | |
| LEFT01~LEFT09 | nvarchar(20) | Y | 좌안 측정값 (동일 순서) | |
| OPERATION_MEMO | nvarchar(1000) | Y | 수술 메모 | |
| MOTIVE_EMP_NUM | char(6) | Y | 내원동기 담당 직원 | |
| OP_EMP4~OP_EMP6 | char(6) | Y | 추가 스태프 | 사용 빈도 낮음 |

> 외 69개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OPERATIONDATA'` 으로 전체 조회

## 함정 (Gotchas)

- **OP_EMP 순서가 직관과 다름**: OP_EMP1=O담당, OP_EMP2=**C담당**, OP_EMP3=**A담당**. INSERT/UPDATE 시 반드시 레거시 매핑 확인. `customer-surgery.js:151` 주석 참고.
- **고객당 1행 구조**: UPSERT 패턴 사용 (`IF EXISTS → UPDATE ELSE INSERT`). 복수 수술 이력은 지원하지 않음.
- **Cataract_Operationdata와 중복 가능**: 시력교정+백내장 모두 받은 환자는 양쪽 테이블에 행 존재. 통계에서 UNION 시 중복 제거 필요 (`SurgeryStatsRepository`에서 `NOT EXISTS Cataract_Operationdata`로 필터).
- **OPERATION_DATE가 char(10)**: 날짜 비교 시 문자열 비교로 동작. `YYYY-MM-DD` 형식이 아닌 데이터가 혼재할 수 있으므로 `ISNULL(..., '') != ''` 가드 필요.
- **COSTPRICE JOIN 시 원데이 수술 함정**: `TODAY_YN = 'Y'`인 경우 검사일과 수술일이 동일하여, COSTPRICE에서 수술비와 검사비 구분이 불가능해짐. → `PrcItmLst.PrcCod` 기반 분리 필요 (COSTPRICE.md 참조).

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `routes/customer-surgery.js` | 고객 시력교정수술 CRUD (GET/PUT/DELETE) | R/W |
| `services/customer-read-service.js` | 고객 목록에서 최근 수술일 표시 (OUTER APPLY) | R |
| `services/customer-etc-panels-service.js` | 고객 상세 — 수술 정보 패널 | R |
| `services/recall-service.js` | 리콜 대상 수술일 조회 | R |
| `services/sp-memo-cache.js` | 수술 메모 캐시 (OPERATIONDATA + OPERATIONDATA_MEMO JOIN) | R |
| `services/overseas-marketing-service.js` | 해외마케팅 수술 방법/날짜/비용 동기화 | R |
| `routes/surgery-schedule.js` | 수술 스케줄 (RESERVATION + OPERATIONDATA JOIN) | R |
| `routes/referral.js` | 소개 환자 수술 여부 확인 | R |
| `routes/referral-vip.js` | VIP 소개 — 수술 환자 필터 | R |
| `routes/b2b-corp-settlement.js` | B2B 기업 정산 (시력교정 UNION 백내장) | R |
| `routes/b2b-military-settlement.js` | B2B 군인 정산 (동일 구조) | R |
| `routes/b2b-corp-surgery-patient.js` | B2B 기업 수술자 목록 (메인 FROM) | R |
| `routes/b2b-*-reservation.js` | B2B 예약 목록에서 수술 여부 LEFT JOIN | R |
| `routes/cataract-surgery-list.js` | 백내장 수술 목록 (노안 포함 UNION) | R |
| `routes/cataract-outpatient.js` | 백내장 외래 — 수술 이력 서브쿼리 | R |
| `routes/stats-weekly-report.js` | 주간 리포트 수술 통계 | R |
| `routes/stats-b-counselor.js` | 상담사 통계 — 수술 전환율 | R |
| `routes/overseas-marketing.js` | 해외마케팅 매출 집계 | R |
| `routes/emergency-call.js` | 응급 콜 — 수술 이력 확인 | R |
| `routes/customer-qa.js` | 고객 QA 전체 조회 | R |

### EyeChartPro Backend (Java)

| 파일 | 용도 | R/W |
|------|------|-----|
| `SurgeryStatsRepository.java` | 월별 시력교정 수술 환자 수 (백내장 제외) | R |
| `ConsultationRateRepository.java` | 상담 → 수술 전환율 (실제 수술일 기준) | R |
| `B2bRevenueStatsRepository.java` | B2B 매출 통계 — 수술 데이터 JOIN | R |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- [Cataract_Operationdata.md](./Cataract_Operationdata.md) — 백내장 수술 테이블 (144컬럼)
- [COSTPRICE.md](./COSTPRICE.md) — 수납/비용 (OPERATION_DATE = COST_DATE JOIN)
- [CUSTOM.md](./CUSTOM.md) — 고객 마스터
- [EMPLOYEE.md](./EMPLOYEE.md) — 직원 (수술의/스태프)

## 대표 조회 예시

```sql
-- 고객별 시력교정수술 정보 조회 (customer-surgery.js)
SELECT OPERATION_DATE, OPERATIONR, OPERATIONL, OPERATION_DOC, OPERATION_FLAB,
       OP_EMP1, OP_EMP2, OP_EMP3, TODAY_YN, REOP_Impossible, PRP, OPCARD_YN,
       RIGHT01, RIGHT02, RIGHT03, RIGHT04, RIGHT05, RIGHT06, RIGHT07, RIGHT08, RIGHT09,
       LEFT01, LEFT02, LEFT03, LEFT04, LEFT05, LEFT06, LEFT07, LEFT08, LEFT09,
       OPERATION_MEMO
FROM OPERATIONDATA WITH(NOLOCK)
WHERE CUST_NUM = @CustNum

-- 고객 목록 — 최근 수술일 (customer-read-service.js)
OUTER APPLY (
  SELECT TOP 1 OPERATION_DATE
  FROM OPERATIONDATA WITH(NOLOCK)
  WHERE cust_num = A.CUST_NUM
  ORDER BY OPERATION_DATE DESC
) OP

-- 시력교정 + 백내장 UNION (b2b-corp-settlement.js)
SELECT op.CUST_NUM, op.OPERATION_DATE, op.OPERATIONR, op.OPERATIONL, op.OPERATION_DOC
FROM OPERATIONDATA op WITH(NOLOCK)
WHERE op.OPERATION_DATE BETWEEN @startDate AND @endDate
UNION ALL
SELECT co.CUST_NUM, co.OPERATIONL_DATE, ...
FROM Cataract_Operationdata co WITH(NOLOCK)
WHERE ...
```
