# RESERVE_HISTORY

> **DB**: SOFTCRM | **컬럼**: 44개 | **행 수**: ~6,853,726 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

예약 변경이력(감사 추적) 테이블. 예약(`RESERVE_NUM`, NOT NULL)의 상태/유형/담당 변경 시점 스냅샷을 변경 일시(`HISTORY_TIME`)·수행자(`LOGIN_EMP`)·IP(`HISTORY_IP`)와 함께 기록한다. 680만건+ 대용량.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HISTORY_NUM | char(22) | |
| JOIN | RESERVE_NUM | char(22) | NOT NULL → RESERVATION.RESERVE_NUM (1:N) |
| JOIN | CUST_NUM | char(13) | → CUSTOM.CUST_NUM |
| JOIN | EMP_NUM / LOGIN_EMP / RESERVE_EMP / RESERVE_DOC / SELECT_DOC / REGISTER_EMP | char(6) | → EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HISTORY_NUM | char(22) | N | | PK |
| CUST_NUM | char(13) | Y | |  |
| RESERVE_NUM | char(22) | N | |  |
| RESERVE_DATE | char(10) | Y | |  |
| START_TIME | char(5) | Y | |  |
| END_TIME | char(5) | Y | |  |
| RESERVE_FLAG | nvarchar(30) | Y | |  |
| RESERVE_STATE | char(1) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| MEMO | nvarchar(200) | Y | |  |
| HISTORY_TIME | varchar(50) | Y | |  |
| HISTORY_IP | varchar(50) | Y | |  |
| CUST_NAME | nvarchar(100) | Y | |  |
| CUST_ENAME | nvarchar(30) | Y | |  |
| CALL_NUM1 | varchar(30) | Y | |  |

> 외 29개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESERVE_HISTORY'` 으로 전체 조회

## 함정 (Gotchas)

- **680만건 대용량**: `WITH(NOLOCK)` + RESERVE_NUM 또는 날짜 조건 없이 전체 스캔 금지.
- **RESERVE_FLAG가 nvarchar(30)**: RESERVATION.RESERVE_FLAG(char(1) 코드)와 달리 코드가 아닌 문자열이 들어갈 수 있다. 원본 테이블과 같은 코드 체계로 가정하지 말 것.
- **HISTORY_TIME이 varchar(50)**: datetime이 아니라 문자열 — 정렬/범위 비교 시 형식 확인 필요.

## 사용처

<!-- TODO: grep -r 'FROM RESERVE_HISTORY\|JOIN RESERVE_HISTORY' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
