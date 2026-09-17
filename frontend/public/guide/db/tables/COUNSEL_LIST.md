# COUNSEL_LIST

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~479,694 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

상담 이력 테이블. 고객(`CUST_NUM`, NOT NULL)별 상담 건을 기록 — 상담 코드(`COUNSEL_CD`)·진행 단계(`STEP_STATE`/`STEP_PLAN`/`STEP_ACTION`)·상담 내용(`COUNSEL_CONTENT`)·연결 예약(`RESERVE_NUM`)을 보관한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | COUNSEL_NUM | char(30) | ⚠️ char(30) — RESERVE_NUM 등 char(22) 번호 체계와 길이가 다름 |
| JOIN | CUST_NUM | char(13) | NOT NULL → CUSTOM.CUST_NUM |
| JOIN | EMP_NUM / ACTION_EMP_NUM | char(6) | 상담/조치 직원 → EMPLOYEE.EMP_NUM |
| JOIN | RESERVE_NUM | char(22) | 연결 예약 → RESERVATION.RESERVE_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| COUNSEL_NUM | char(30) | N | | PK |
| CUST_NUM | char(13) | N | |  |
| EMP_NUM | char(6) | Y | |  |
| COUNSEL_CD | varchar(5) | Y | |  |
| STEP_STATE | char(1) | Y | |  |
| STEP_PLAN | nvarchar(20) | Y | |  |
| STEP_ACTION | char(10) | Y | |  |
| ACTION_EMP_NUM | char(6) | Y | |  |
| ACTION_MEMO | nvarchar(1000) | Y | |  |
| COUNSEL_CONTENT | varchar(6000) | Y | |  |
| CRE_DT | char(10) | Y | |  |
| RESERVE_NUM | char(22) | Y | |  |
| ReReCallDate | varchar(10) | Y | |  |
| CHECK_FLAG | char(1) | Y | |  |
| Program | varchar(50) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM COUNSEL_LIST\|JOIN COUNSEL_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
