# Schedule

> **DB**: SOFTCRM | **컬럼**: 13개 | **행 수**: ~8,922 (WORK DB 기준)
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
| emp_num | nvarchar(20) | N | |  |
| emp_name | nvarchar(30) | N | |  |
| grade | nvarchar(3) | N | |  |
| flag | nvarchar(3) | N | |  |
| start_date | nvarchar(12) | Y | |  |
| end_date | nvarchar(12) | Y | |  |
| emp_initial | nvarchar(10) | Y | |  |
| comments | nvarchar(400) | Y | |  |
| idx_integrate | int | Y | |  |
| reserve_flag | char(1) | Y | |  |
| reserve_name | nvarchar(30) | Y | |  |
| Schedule_Flag | nchar(1) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Schedule\|JOIN Schedule' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
