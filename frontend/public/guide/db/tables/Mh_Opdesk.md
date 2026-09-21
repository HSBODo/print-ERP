# Mh_Opdesk

> **DB**: MCRM | **컬럼**: 14개 | **행 수**: ~140,485 (WORK DB 기준)
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
| ReceNo | int | N | |  |
| cust_num | char(13) | Y | |  |
| cust_name | nvarchar(30) | Y | |  |
| MedDate | char(10) | Y | |  |
| Cancel | char(1) | Y | |  |
| workid | char(6) | Y | |  |
| SaveTime | datetime | Y | |  |
| Dr_confirm | char(6) | Y | |  |
| Dr_confirmYN | char(1) | Y | |  |
| Dr_confirm_time | nvarchar(30) | Y | |  |
| overhaul | varchar(6) | Y | |  |
| basic | varchar(6) | Y | |  |
| recovery | varchar(6) | Y | |  |
| receipt | varchar(6) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Mh_Opdesk\|JOIN Mh_Opdesk' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
