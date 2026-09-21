# EXAM_FU

> **DB**: SOFTCRM | **컬럼**: 35개 | **행 수**: ~15 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | |
| PK | SEQ | int | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | | PK |
| SEQ | int | N | | PK |
| EXAM_DATE | char(10) | Y | |  |
| EXAM_MEMO | varchar(1000) | Y | |  |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |
| RIGHT02 | nvarchar(20) | Y | |  |
| LEFT02 | nvarchar(20) | Y | |  |
| RIGHT03 | nvarchar(20) | Y | |  |
| LEFT03 | nvarchar(20) | Y | |  |
| RIGHT04 | nvarchar(20) | Y | |  |
| LEFT04 | nvarchar(20) | Y | |  |
| RIGHT05 | nvarchar(20) | Y | |  |
| LEFT05 | nvarchar(20) | Y | |  |
| RIGHT06 | nvarchar(20) | Y | |  |

> 외 20개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'EXAM_FU'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM EXAM_FU\|JOIN EXAM_FU' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
