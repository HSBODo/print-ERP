# Schedule_List

> **DB**: SOFTCRM | **컬럼**: 8개 | **행 수**: ~71,568 (WORK DB 기준)
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
| f_idx | int | Y | |  |
| f_idx_integrate | int | Y | |  |
| flag | nvarchar(50) | Y | |  |
| week_code | nvarchar(50) | Y | |  |
| week_name | nvarchar(50) | Y | |  |
| start_Time | nvarchar(50) | Y | |  |
| end_Time | nvarchar(50) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Schedule_List\|JOIN Schedule_List' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
