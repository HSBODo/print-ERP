# RECALL_LIST

> **DB**: SOFTCRM | **컬럼**: 17개 | **행 수**: ~22,340 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

리콜(재내원 안내) 이력 테이블. 예약(`RESERVE_NUM`, NOT NULL) 단위로 리콜 시도와 결과(`RECALL_STATE`)·미예약 사유(`NO_RESERVE_CD`/`NO_RESERVE_MEMO`)·재리콜(`RERECALL_YN`/`RERECALL_DATE`)·성공 시 연결 예약(`SUCCESS_RESERVE_NUM`)을 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | RECALL_NUM | char(22) | |
| JOIN | RESERVE_NUM | char(22) | NOT NULL. 리콜 발생 기준 예약 → RESERVATION.RESERVE_NUM |
| JOIN | SUCCESS_RESERVE_NUM | char(22) | 리콜 성공 시 생성된 예약 → RESERVATION.RESERVE_NUM |
| JOIN | CUST_NUM | char(13) | → CUSTOM.CUST_NUM |
| JOIN | EMP_NUM | char(6) | 리콜 담당 직원 → EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| RECALL_NUM | char(22) | N | | PK |
| RESERVE_NUM | char(22) | N | |  |
| CUST_NUM | char(13) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| COUNSEL_CD | varchar(5) | Y | |  |
| RECALL_DATE | char(10) | Y | |  |
| ACTION_MEMO | nvarchar(1000) | Y | |  |
| QUESTION_CD | char(5) | Y | |  |
| RERECALL_YN | char(1) | Y | |  |
| RERECALL_DATE | char(10) | Y | |  |
| RECALL_STATE | char(1) | Y | |  |
| NO_RESERVE_CD | char(3) | Y | |  |
| NO_RESERVE_MEMO | nvarchar(50) | Y | |  |
| SUCCESS_RESERVE_NUM | char(22) | Y | |  |
| PreHstNum | varchar(22) | Y | |  |

> 외 2개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RECALL_LIST'` 으로 전체 조회

## 함정 (Gotchas)

- **RECALL_STATE 값 분포** (WORK 실측 2026-08-10): `0`=19,087 / NULL=1,050 / `1`=960 / `2`=559 / `D`=440 / 공백=244. 코드 의미표는 미확인 — 상태별 집계 전 코드 정의 확인 필요.
- **RESERVE_NUM이 NOT NULL**: 예약 없이 생성되는 리콜은 이 테이블에 없다. 예약과 무관한 리콜은 [RECALL_MR_LIST.md](./RECALL_MR_LIST.md) 참조.

## 사용처

<!-- TODO: grep -r 'FROM RECALL_LIST\|JOIN RECALL_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
