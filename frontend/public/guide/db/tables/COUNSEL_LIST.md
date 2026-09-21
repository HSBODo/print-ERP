# COUNSEL_LIST

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~474,760 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | COUNSEL_NUM | char(30) | |

<!-- TODO: FK, JOIN 키 추가 -->

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
