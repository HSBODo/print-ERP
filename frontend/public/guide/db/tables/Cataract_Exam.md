# Cataract_Exam

> **DB**: SOFTCRM | **컬럼**: 87개 | **행 수**: ~9,407 (WORK DB 기준)
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
| CUST_NUM | char(13) | N | |  |
| SEQ | int | N | |  |
| EXAM_DATE | char(10) | Y | |  |
| EXAM_MEMO | nvarchar(2000) | Y | |  |
| Stop_YN | char(1) | Y | |  |
| Cancel_CD | char(3) | Y | |  |
| Cancel_reason | nvarchar(50) | Y | |  |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |
| RIGHT02 | nvarchar(20) | Y | |  |
| LEFT02 | nvarchar(20) | Y | |  |
| RIGHT03 | nvarchar(20) | Y | |  |
| LEFT03 | nvarchar(20) | Y | |  |
| RIGHT04 | nvarchar(20) | Y | |  |
| LEFT04 | nvarchar(20) | Y | |  |

> 외 72개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Cataract_Exam'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Cataract_Exam\|JOIN Cataract_Exam' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
