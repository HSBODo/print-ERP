# RECALL_MR_LIST

> **DB**: SOFTCRM | **컬럼**: 13개 | **행 수**: ~37,594 (WORK DB 기준)
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
| RECALL_GUBUN | char(1) | Y | |  |
| CUST_NUM | char(13) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| RECALL_STATE | char(1) | Y | |  |
| RECALL_DATE | char(10) | Y | |  |
| ACTION_MEMO | nvarchar(1000) | Y | |  |
| NO_RESERVE_CD | char(3) | Y | |  |
| NO_RESERVE_MEMO | nvarchar(50) | Y | |  |
| SUCCESS_RESERVE_NUM | char(22) | N | |  |
| ReReCallDate | varchar(10) | Y | |  |
| ReasonNum | char(22) | Y | |  |
| InspcNum | char(22) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RECALL_MR_LIST\|JOIN RECALL_MR_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
