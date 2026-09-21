# RECALL_LIST

> **DB**: SOFTCRM | **컬럼**: 17개 | **행 수**: ~22,340 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | RECALL_NUM | char(22) | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| RECALL_NUM | char(22) | N | | PK |
| RESERVE_NUM | char(22) | N | |  |
| CUST_NUM | char(13) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| COUNSEL_CD | varchar(5) | Y | |  |
| RECALL_DATE | char(10) | Y | |  |
| ACTION_MEMO | nvarchar(1000) | Y | |  |
| QUESTION_CD | char(5) | Y | |  |
| RERECALL_YN | char(1) | Y | |  |
| RERECALL_DATE | char(10) | Y | |  |
| RECALL_STATE | char(1) | Y | |  |
| NO_RESERVE_CD | char(3) | Y | |  |
| NO_RESERVE_MEMO | nvarchar(50) | Y | |  |
| SUCCESS_RESERVE_NUM | char(22) | Y | |  |
| PreHstNum | varchar(22) | Y | |  |

> 외 2개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RECALL_LIST'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RECALL_LIST\|JOIN RECALL_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
