# RFCARD_LIST

> **DB**: SOFTCRM | **컬럼**: 10개 | **행 수**: ~82,819 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| IDX | int | N | | PK |
| CUST_NUM | char(13) | N | |  |
| RESERVE_FLAG | char(1) | N | |  |
| CHECK_DATE | char(10) | N | |  |
| CHECK_TIME | char(5) | N | |  |
| READER_CD | char(3) | N | |  |
| CHECK_DOC | char(6) | Y | |  |
| CHECK_EMP | char(6) | Y | |  |
| UNIT_CD | char(3) | Y | |  |
| SavedProgram | nvarchar(50) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RFCARD_LIST\|JOIN RFCARD_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
