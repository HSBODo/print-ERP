# Clinic_Assign

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~169,809 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

진료(수술) 배정 테이블. 예약(`Reserve_Num`) 단위 1행으로 좌/우안 수술명(`OPR`/`OPL`)·수술의(`OPDoc`)·플랩 담당(`Flap`)·레이저 장비(`Laser`)·확정 담당(`Confirm`)·재수술 여부(`ReOp`)를 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | Reserve_Num | char(22) | → RESERVATION.RESERVE_NUM (예약당 1행) |
| JOIN | Cust_Num | char(13) | → CUSTOM.CUST_NUM |
| JOIN | OPDoc / Flap / Confirm / Reg_Emp | varchar(6) | → EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | |  |
| InsertedTime | datetime | Y | |  |
| Reserve_Num | char(22) | N | | PK |
| Cust_Num | char(13) | Y | |  |
| OPR | varchar(100) | Y | |  |
| OPL | varchar(100) | Y | |  |
| Confirm | varchar(6) | Y | |  |
| OPDoc | varchar(6) | Y | |  |
| Flap | varchar(6) | Y | |  |
| Laser | varchar(100) | Y | |  |
| SavedTime | datetime | Y | |  |
| Reg_Emp | varchar(6) | Y | |  |
| visable | char(1) | Y | |  |
| ReOp | char(1) | Y | |  |
| PLUS | nchar(10) | Y | |  |

## 함정 (Gotchas)

- **직원 필드가 varchar(6)**: EMPLOYEE.EMP_NUM(char(6))과 타입은 호환되지만, `Confirm`은 이름과 달리 Y/N 플래그가 아니라 직원번호가 들어가는 컬럼이다.
- **`visable` 오탈자 컬럼**: (visible 아님) 노출 여부 플래그 — 조회 시 컬럼명 그대로 사용해야 한다.

## 사용처

<!-- TODO: grep -r 'FROM Clinic_Assign\|JOIN Clinic_Assign' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
