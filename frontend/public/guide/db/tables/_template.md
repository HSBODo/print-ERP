# {TABLE_NAME}

> **DB**: {DB_NAME} | **컬럼**: {COL_COUNT}개 | **행 수**: {ROW_COUNT} (WORK DB 기준)
> **최종 갱신**: {DATE}

## 역할

{한 줄 설명}

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | | | |
| FK → | | | 참조 대상 테이블.컬럼 |
| ← FK | | | 이 테이블을 참조하는 테이블 |
| JOIN | | | 자주 사용되는 JOIN 키 (PK/FK 아닌 것) |

## 핵심 컬럼 (상위 10~15개)

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| | | | | |

> 전체 컬럼은 `INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{TABLE_NAME}'` 으로 조회

## 함정 (Gotchas)

-

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| | | |

### EyeChartPro Backend (Java)

| 파일 | 용도 | R/W |
|------|------|-----|
| | | |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도

## 대표 조회 예시

```sql
-- {설명}
SELECT ...
FROM {TABLE_NAME} WITH(NOLOCK)
WHERE ...
```
