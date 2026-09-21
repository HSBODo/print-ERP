# Notice_List

> **DB**: SOFTCRM | **컬럼**: 12개 | **행 수**: ~7 (WORK DB 기준)
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
| pkey | int | N | |  |
| item_code | nchar(2) | Y | |  |
| seq | int | Y | |  |
| notice_title | nvarchar(50) | Y | |  |
| notice_content | nvarchar(-1) | Y | |  |
| emp_num | nchar(6) | Y | |  |
| reg_date | nchar(20) | Y | |  |
| start_date | nchar(10) | Y | |  |
| end_date | nchar(10) | Y | |  |
| is_pinned | nchar(1) | N | |  |
| is_important | nchar(1) | N | |  |
| target_dept | nvarchar(200) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Notice_List\|JOIN Notice_List' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
