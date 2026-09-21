# DoctorMaster

> **DB**: MCRM | **컬럼**: 9개 | **행 수**: ~21 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블) | | |

<!-- TODO: FK, JOIN 키 추가 -->

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

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM DoctorMaster\|JOIN DoctorMaster' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
