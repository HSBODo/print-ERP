# CTI_COUNSEL_LIST

> **DB**: SOFTCRM | **컬럼**: 17개 | **행 수**: ~445,815 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

CTI(전화 상담) 이력 테이블. 콜 상담 건별로 상담일(`COUNSEL_DATE`, NOT NULL)·유입 경로(`ROUTE_CD`)·TM 코드(`TM_GUBUN_CODE`/`TM_STATE_CODE`)·리콜 요청/완료(`RECALL_*`)를 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | COUNSEL_NUM | char(22) | |
| JOIN | CUST_NUM | varchar(20) | NOT NULL. ⚠️ CUSTOM.CUST_NUM(char(13))과 타입이 다름 — CTI 번호 체계(CUSTOM.CUST_NUM_CTI varchar(20))와 연계 |
| JOIN | EMP_NUM / RECALL_EMP | char(6) | 상담/리콜 직원 → EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| COUNSEL_NUM | char(22) | N | | PK |
| COUNSEL_DATE | char(10) | N | |  |
| CUST_GUBUN | char(1) | Y | |  |
| CUST_NUM | varchar(20) | N | |  |
| EMP_NUM | char(6) | Y | |  |
| ROUTE_CD | varchar(4) | Y | |  |
| OK_STATE | char(1) | Y | |  |
| COUNSEL_MEMO | varchar(6000) | Y | |  |
| TM_GUBUN_CODE | varchar(50) | Y | |  |
| TM_STATE_CODE | varchar(50) | Y | |  |
| RECALL_STATE | int | N | |  |
| RECALL_REQUEST_DATE | varchar(20) | Y | |  |
| RECALL_COMPLETE_DATE | varchar(20) | Y | |  |
| COUNSEL_PROGRAM | varchar(20) | Y | |  |
| RECALL_MEMO | nvarchar(3000) | Y | |  |

> 외 2개 컬럼: `RECALL_EMP` char(6), `RERECALLDATE` varchar(10) — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CTI_COUNSEL_LIST'` 으로 전체 조회

## 함정 (Gotchas)

- **CUST_NUM 타입 불일치**: varchar(20) — CUSTOM.CUST_NUM(char(13))과 직접 JOIN 시 암시적 형변환·번호 체계 차이 주의 (CTI 고객번호는 CUSTOM.CUST_NUM_CTI 컬럼 참조).
- **RECALL_STATE는 int NOT NULL**: RECALL_LIST/RECALL_MR_LIST의 char(1) RECALL_STATE와 타입이 다르다. 같은 이름이라고 같은 코드 체계로 가정하지 말 것.

## 사용처

<!-- TODO: grep -r 'FROM CTI_COUNSEL_LIST\|JOIN CTI_COUNSEL_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
