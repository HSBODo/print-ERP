# CUSTOM_HISTORY

> **DB**: SOFTCRM | **컬럼**: 22개 | **행 수**: ~2,498,487 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HistoryNum | char(22) | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HistoryNum | char(22) | N | | PK |
| Cust_num | nvarchar(20) | Y | |  |
| Cust_name | nvarchar(100) | Y | |  |
| Counsel_Emp | nvarchar(6) | Y | |  |
| Counsel_Doc | nvarchar(6) | Y | |  |
| Cust_Level | nvarchar(1) | Y | |  |
| Select_Doc | nvarchar(6) | Y | |  |
| State | char(1) | Y | |  |
| Reg_Emp | nvarchar(6) | Y | |  |
| Reg_Date | nvarchar(10) | Y | |  |
| Reg_Time | nvarchar(10) | Y | |  |
| Login_Emp | nvarchar(6) | Y | |  |
| IP | nvarchar(50) | Y | |  |
| Optometrist | nvarchar(6) | Y | |  |
| Call_Num1 | nvarchar(50) | Y | |  |

> 외 7개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOM_HISTORY'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM CUSTOM_HISTORY\|JOIN CUSTOM_HISTORY' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
