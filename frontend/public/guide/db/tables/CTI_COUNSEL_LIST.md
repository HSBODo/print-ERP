# CTI_COUNSEL_LIST

> **DB**: SOFTCRM | **컬럼**: 17개 | **행 수**: ~438,560 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | COUNSEL_NUM | char(22) | |

<!-- TODO: FK, JOIN 키 추가 -->

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

> 외 2개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CTI_COUNSEL_LIST'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM CTI_COUNSEL_LIST\|JOIN CTI_COUNSEL_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
