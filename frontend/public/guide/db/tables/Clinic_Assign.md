# Clinic_Assign

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~166,813 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | Reserve_Num | char(22) | |

<!-- TODO: FK, JOIN 키 추가 -->

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

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Clinic_Assign\|JOIN Clinic_Assign' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
