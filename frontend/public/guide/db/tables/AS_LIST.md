# AS_LIST

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: ~71,791 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

A/S(사후관리) 이력 테이블. 수술 후 환자의 경과 관찰, 리콜(재내원 안내), 조치 내역을 회차별로 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | AS_NUM | nvarchar(20) | A/S 관리번호 |
| JOIN | CUST_NUM | nvarchar(20) | 고객번호. CUSTOM.CustNum과 JOIN |
| JOIN | EMP_NUM | char(6) | 등록 직원. EMPLOYEE.EMP_NUM과 JOIN |
| JOIN | AS_Action_EMP_NUM | char(6) | 조치 직원. EMPLOYEE.EMP_NUM과 JOIN |
| JOIN | AS_Count | int | 회차 번호. 다회차 JOIN 시 사용 (`AS_Count = '1'`, `'2'` 등) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| AS_NUM | nvarchar(20) | N | A/S 관리번호 | PK |
| CUST_NUM | nvarchar(20) | Y | 고객번호 | CUSTOM.CustNum |
| EMP_NUM | char(6) | Y | 등록 직원 코드 | EMPLOYEE.EMP_NUM |
| INSERT_DATE | char(10) | Y | 등록일 | 'YYYY-MM-DD' |
| AS_Count | int | Y | **회차 번호** (1차, 2차, ...) | 다회차 JOIN 키로 사용 |
| AS_Big_CD | char(1) | Y | 대분류 코드 | |
| AS_Mid_CD | char(3) | Y | 중분류 코드 | |
| AS_ADD_CD | nvarchar(2) | Y | 추가 분류 코드 | |
| AS_STATE | nvarchar(1) | Y | A/S 상태 | |
| AS_Check_DATE | char(10) | Y | 확인일 | |
| AS_MEMO | nvarchar(300) | Y | **빈 컬럼 -- 사용 금지** | 데이터 없음, AS_Content 사용할 것 |
| AS_Content | nvarchar(1000) | Y | **실제 메모 내용** | `recall_memo`로 프론트 매핑 |
| AS_Action_DATE | nchar(10) | Y | 조치일 | |
| AS_Action_EMP_NUM | char(6) | Y | 조치 직원 코드 | EMPLOYEE.EMP_NUM |
| AS_OP_code | char(2) | Y | 수술 코드 | |

> 외 1개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AS_LIST'` 으로 전체 조회

## 함정 (Gotchas)

- **`AS_MEMO` 컬럼은 빈 컬럼 — 절대 사용 금지.** DB에 데이터가 없다. 레거시 컬럼으로 추정.
- **실제 메모는 `AS_Content` 컬럼.** 프론트엔드에서는 `recall_memo`로 매핑된다 (`recall-surgery-service.js:85` 참조).
- **`AS_Count`는 회차 번호** (1, 2, 3...). 카운트/집계 값이 아니라 순서를 나타낸다. 다회차 A/S를 LEFT JOIN할 때 `AS_Count = '1'`, `AS_Count = '2'`로 분리 JOIN하는 패턴이 있다 (`outpatient-as-recall.js:39-40`).
- **`sp-memo-cache.js`에서 AS_MEMO와 AS_Content를 별도 별칭으로 매핑** — `AS_MEMO → RgtMmo` (등록 메모), `AS_Content → RclMmo` (리콜 메모). AS_MEMO에 데이터가 없으므로 RgtMmo는 항상 빈 문자열.
- **`customer-response-service.js`에서 방어적 폴백 사용** — `AS_Content || AS_MEMO` 순서로 우선순위 처리 (`row.AS_Content || row.AS_MEMO || ''`).

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-read-service.js` | 고객 패널 A/S 이력 조회 (AS_Count, AS_Content) | R |
| `services/customer-response-service.js` | 고객 응대 패널 A/S 이력 조회 + 매핑 | R |
| `services/recall-surgery-service.js` | 수술 리콜 목록에서 A/S 이력 표시 (as_recall_order, recall_memo) | R |
| `services/sp-memo-cache.js` | SP_CUSTOM_MEMO 분해 대체 — A/S 메모 캐시 | R |
| `routes/customer-qa.js` | 고객 QA 패널 A/S 목록 조회 | R |
| `routes/outpatient-as-recall.js` | 외래 A/S 리콜 — 회차별 LEFT JOIN (`AS_Count = '1'`, `'2'`) | R |

### EyeChartPro Backend (Java)

| 파일 | 용도 | R/W |
|------|------|-----|
| (해당 없음 — Node.js 전용 프로젝트) | | |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- MEMORY.md `recall-as-fields.md` 참조 — AS_MEMO vs AS_Content 구분 상세

## 대표 조회 예시

```sql
-- 고객의 A/S 이력 전체 조회 (가장 기본적인 패턴)
SELECT a.AS_Count,
       a.INSERT_DATE,
       a.EMP_NUM,
       ISNULL(a.AS_Content, '') AS AS_Content
FROM AS_LIST a WITH(NOLOCK)
WHERE a.CUST_NUM = @custNum
ORDER BY a.AS_Count

-- 회차별 분리 JOIN (외래 A/S 리콜 패턴)
SELECT op.*,
       a1.AS_Content AS as1_memo,
       a2.AS_Content AS as2_memo
FROM OPERATIONDATA op
LEFT JOIN AS_LIST a1 ON a1.CUST_NUM = op.CUST_NUM AND a1.AS_Count = '1'
LEFT JOIN AS_LIST a2 ON a2.CUST_NUM = op.CUST_NUM AND a2.AS_Count = '2'

-- 리콜 서비스 매핑 (AS_Content → recall_memo)
SELECT a.AS_Count AS as_recall_order,
       ISNULL(a.AS_MEMO, '') AS as_memo,       -- 항상 빈 문자열
       ISNULL(a.AS_Content, '') AS recall_memo  -- 실제 메모
FROM AS_LIST a WITH(NOLOCK)
WHERE a.CUST_NUM = @custNum
```
