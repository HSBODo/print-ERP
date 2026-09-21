# MOTIVE_NEW02

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: ~569,005 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | pkey | int | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | | PK |
| fkey | int | N | |  |
| cust_num | nvarchar(23) | Y | |  |
| cust_name | nvarchar(100) | N | |  |
| category01_key | int | Y | |  |
| category01_name | nvarchar(50) | N | |  |
| category02_key | int | Y | |  |
| category02_name | nvarchar(100) | Y | |  |
| code | nvarchar(20) | Y | |  |
| name | nvarchar(100) | N | |  |
| section | smallint | Y | |  |
| Idx | char(1) | Y | |  |
| category03_key | int | Y | |  |
| category03_name | nvarchar(50) | Y | |  |
| OldUniqueNum | nvarchar(23) | Y | |  |

> 외 1개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MOTIVE_NEW02'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM MOTIVE_NEW02\|JOIN MOTIVE_NEW02' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
