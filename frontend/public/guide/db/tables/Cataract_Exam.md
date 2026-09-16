# Cataract_Exam

> **DB**: SOFTCRM | **컬럼**: 87개 | **행 수**: ~9,811 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

백내장 검사 결과 테이블. `CUST_NUM`+`SEQ`로 고객당 복수 행(검사 세션)이 누적된다 — EXAM(시력교정, 고객당 1행 덮어쓰기)과 달리 검사 이력이 행으로 보존된다. 대시보드 '백내장 검사자 리스트'·'검사건수'(EXAM 행 + Cataract_Exam 세션 합산)가 사용.

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

- **PK/유니크 제약 없음 (heap)**: `CUST_NUM`+`SEQ` 조합조차 유일하지 않다 — WORK 실측(2026-08-10): 총 9,811행 / 유일 (CUST_NUM,SEQ) 9,589 (**중복 222건**) / 고유 고객 8,822. 세션 단위 집계 시 중복 행 주의.
- **EXAM과 구조가 다름**: EXAM은 고객당 1행 덮어쓰기, Cataract_Exam은 세션별 행 누적. 두 테이블을 합산하는 통계(검사건수)에서 집계 단위가 다르다는 점 주의.

## 사용처

<!-- TODO: grep -r 'FROM Cataract_Exam\|JOIN Cataract_Exam' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
