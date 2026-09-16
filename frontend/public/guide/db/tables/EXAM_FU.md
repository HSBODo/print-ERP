# EXAM_FU

> **DB**: SOFTCRM | **컬럼**: 35개 | **행 수**: ~15 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK·PROD DB 실측 대조)

## 역할

검사 추적(F/U) 이력 테이블. EXAM(고객당 1행 덮어쓰기)의 이력 보완용 구조이나 **실질 미사용** — WORK 15행 / PROD 14행 (2026-08-10 기준).

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

- **실질 미사용 테이블**: PROD 14행뿐이라 과거 검사·중단 시점을 복원할 소스가 되지 못한다. EXAM의 덮어쓰기 구조로 인한 시점 통계 왜곡은 이 테이블로 보완할 수 없음 ([EXAM.md](./EXAM.md) 함정 참조).

## 사용처

<!-- TODO: grep -r 'FROM EXAM_FU\|JOIN EXAM_FU' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
