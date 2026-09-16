# DoctorMaster

> **DB**: MCRM | **컬럼**: 9개 | **행 수**: 21 (MCRM_WORK DB 기준)
> **최종 갱신**: 2026-08-10 (MCRM_WORK DB 실측 대조)

## 역할

MCRM 의사 마스터(설정) 테이블. 의사(`UserID`)별 사용 여부(`UseYN`)·정렬 순서(`SortNo`)·표시 색상(`ColorRgb`)을 관리하는 소규모 코드 테이블 (21행).

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | `UserID` char(6) NOT NULL이 사실상 키 |
| JOIN | UserID | char(6) | → SOFTCRM.EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| UserID | char(6) | N | |  |
| UseYN | char(1) | N | |  |
| SortNo | int | N | |  |
| ColorRgb | int | N | |  |
| Comment | varchar(500) | Y | |  |
| RegDate | datetime | Y | |  |
| RegUser | varchar(30) | Y | |  |
| ModifyDate | datetime | Y | |  |
| ModifyUser | varchar(30) | Y | |  |

## 함정 (Gotchas)

- **별도 DB(MCRM)**: SOFTCRM 테이블과 JOIN하려면 크로스 DB 쿼리 필요.
- **활성 의사만 볼 때 `UseYN` 필터 필수**.

## 사용처

<!-- TODO: grep -r 'FROM DoctorMaster\|JOIN DoctorMaster' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
