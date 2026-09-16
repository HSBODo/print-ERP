# CUSTOM_HISTORY

> **DB**: SOFTCRM | **컬럼**: 22개 | **행 수**: ~2,518,695 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

CUSTOM 변경 이력(감사) 테이블. 고객 정보 변경 시점의 담당자(상담사/의사/검안사)·등급·연락처·수신거부 스냅샷을 변경 일시(`Reg_Date`/`Reg_Time`)·수행자(`Login_Emp`)·IP와 함께 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HistoryNum | char(22) | |
| JOIN | Cust_num | nvarchar(20) | → CUSTOM.CUST_NUM. ⚠️ 타입 불일치 (char(13) vs nvarchar(20)) |
| JOIN | Counsel_Emp / Counsel_Doc / Select_Doc / Optometrist / Reg_Emp / Login_Emp | nvarchar(6) | → EMPLOYEE.EMP_NUM |

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

> 외 7개 컬럼: `Call_Num2`·`Call_Num3`·`Email` nvarchar(50), `SMS_Geobu`·`Email_Geobu`·`LevelLimit` char(1), `Select_Doc_Second` nvarchar(6) — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOM_HISTORY'` 으로 전체 조회

## 함정 (Gotchas)

- **대용량 테이블 (250만+)**: `WITH(NOLOCK)` + 날짜(`Reg_Date`) 조건 없이 전체 스캔 금지.
- **Cust_num 타입 불일치**: nvarchar(20) — CUSTOM.CUST_NUM(char(13))과 JOIN 시 암시적 형변환으로 인덱스를 못 탈 수 있다. 필요 시 명시적 CAST 검토.
- **Reg_Date/Reg_Time이 nvarchar**: 날짜 정렬·범위 비교 시 문자열 형식(`YYYY-MM-DD`) 가드 필요.

## 사용처

<!-- TODO: grep -r 'FROM CUSTOM_HISTORY\|JOIN CUSTOM_HISTORY' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
