# Schedule

> **DB**: SOFTCRM | **컬럼**: 13개 | **행 수**: ~10,073 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

직원 스케줄 테이블. 직원(`emp_num`/`emp_name`) 단위로 기간(`start_date`~`end_date`)과 스케줄 구분(`flag`), 예약유형 연계(`reserve_flag`/`reserve_name`)를 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int | |
| JOIN | emp_num | nvarchar(20) | NOT NULL → EMPLOYEE.EMP_NUM. ⚠️ 타입 불일치 (char(6) vs nvarchar(20)) |

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

- **날짜가 nvarchar(12)**: `start_date`/`end_date` 범위 비교 시 문자열 형식 확인 필요.
- **emp_num 타입 불일치**: nvarchar(20) — EMPLOYEE.EMP_NUM(char(6))과 JOIN 시 암시적 형변환 주의. 이름(`emp_name`)이 비정규화되어 있어 직원명 변경 시 불일치 가능.

## 사용처

<!-- TODO: grep -r 'FROM Schedule\|JOIN Schedule' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
