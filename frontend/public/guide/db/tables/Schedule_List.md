# Schedule_List

> **DB**: SOFTCRM | **컬럼**: 8개 | **행 수**: ~84,991 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

직원 스케줄 상세(시간대) 테이블 — [Schedule](./Schedule.md)의 하위. 스케줄(`f_idx`)별 요일(`week_code`/`week_name`)·시간대(`start_Time`~`end_Time`)를 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int | |
| FK → | f_idx | int | → Schedule.IDX |
| JOIN | f_idx_integrate | int | → Schedule.idx_integrate (통합 스케줄 연계) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| IDX | int | N | | PK |
| f_idx | int | Y | |  |
| f_idx_integrate | int | Y | |  |
| flag | nvarchar(50) | Y | |  |
| week_code | nvarchar(50) | Y | |  |
| week_name | nvarchar(50) | Y | |  |
| start_Time | nvarchar(50) | Y | |  |
| end_Time | nvarchar(50) | Y | |  |

## 함정 (Gotchas)

- **시간이 nvarchar(50)**: `start_Time`/`end_Time` 정렬·비교 시 문자열 형식 확인 필요.

## 사용처

<!-- TODO: grep -r 'FROM Schedule_List\|JOIN Schedule_List' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
