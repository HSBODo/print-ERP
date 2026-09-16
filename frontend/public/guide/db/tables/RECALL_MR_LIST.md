# RECALL_MR_LIST

> **DB**: SOFTCRM | **컬럼**: 13개 | **행 수**: ~37,602 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

리콜 이력 테이블(MR 계열). [RECALL_LIST](./RECALL_LIST.md)(예약 단위)와 달리 `RESERVE_NUM` 없이 고객 단위로 기록하며, `RECALL_GUBUN`(구분)·`ReasonNum`·`InspcNum`(검사 연계)을 갖는다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | RECALL_NUM | char(22) | |
| JOIN | CUST_NUM | char(13) | → CUSTOM.CUST_NUM |
| JOIN | EMP_NUM | char(6) | 리콜 담당 직원 → EMPLOYEE.EMP_NUM |
| JOIN | SUCCESS_RESERVE_NUM | char(22) | NOT NULL(공백 채움). 리콜 성공 시 연결 예약 → RESERVATION.RESERVE_NUM |
| JOIN | InspcNum | char(22) | 검사 연계 번호 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| RECALL_NUM | char(22) | N | | PK |
| RECALL_GUBUN | char(1) | Y | |  |
| CUST_NUM | char(13) | Y | |  |
| EMP_NUM | char(6) | Y | |  |
| RECALL_STATE | char(1) | Y | |  |
| RECALL_DATE | char(10) | Y | |  |
| ACTION_MEMO | nvarchar(1000) | Y | |  |
| NO_RESERVE_CD | char(3) | Y | |  |
| NO_RESERVE_MEMO | nvarchar(50) | Y | |  |
| SUCCESS_RESERVE_NUM | char(22) | N | |  |
| ReReCallDate | varchar(10) | Y | |  |
| ReasonNum | char(22) | Y | |  |
| InspcNum | char(22) | Y | |  |

## 함정 (Gotchas)

- **RECALL_GUBUN 값 분포** (WORK 실측 2026-08-10): `N`=33,733 / `S`=3,869 두 종뿐. 코드 의미표 미확인.
- **SUCCESS_RESERVE_NUM은 NOT NULL이지만 대부분 공백**: 비공백(실제 성공 예약 연결)은 1,884건(약 5%). `RECALL_STATE='1'` 건수(1,884)와 정확히 일치 — `1`=예약성공으로 추정.
- **RECALL_STATE 값 분포** (WORK 실측 2026-08-10): `2`=28,543 / `0`=6,800 / `1`=1,884 / `D`=326 / 공백=49. RECALL_LIST와 분포 양상이 다르니(RECALL_LIST는 `0`이 최다) 동일 코드로 가정하지 말 것.

## 사용처

<!-- TODO: grep -r 'FROM RECALL_MR_LIST\|JOIN RECALL_MR_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
