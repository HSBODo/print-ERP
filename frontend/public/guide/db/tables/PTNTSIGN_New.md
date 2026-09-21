# PTNTSIGN_New

> **DB**: IPLUS | **컬럼**: 17개 | **행 수**: ~103,774 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블) | | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HOSPCODE | varchar(2) | N | |  |
| REGDATE | varchar(10) | N | |  |
| PTNTIDNO | varchar(15) | N | |  |
| Agree2 | smallint | N | |  |
| Agree3 | smallint | N | |  |
| Agree4 | smallint | N | |  |
| AI_1 | smallint | N | |  |
| AI_2 | smallint | N | |  |
| Sign1 | text(2147483647) | Y | |  |
| Sign2 | text(2147483647) | Y | |  |
| pNm | varchar(40) | N | |  |
| pHpp | varchar(13) | N | |  |
| pFm | varchar(20) | N | |  |
| pBith | varchar(20) | N | |  |
| ADDTDATE | datetime | Y | |  |

> 외 2개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM IPLUS_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PTNTSIGN_New'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM PTNTSIGN_New\|JOIN PTNTSIGN_New' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
