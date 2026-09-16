# Mh_Opdesk

> **DB**: MCRM | **컬럼**: 14개 | **행 수**: ~143,489 (MCRM_WORK DB 기준)
> **최종 갱신**: 2026-08-10 (MCRM_WORK DB 실측 대조)

## 역할

MCRM 수술 데스크 접수 테이블. 접수번호(`ReceNo`)·진료일(`MedDate`)·취소 여부(`Cancel`)·의사 확인(`Dr_confirm`/`Dr_confirmYN`/`Dr_confirm_time`)과 단계별 담당 직원(`overhaul`/`basic`/`recovery`/`receipt`)을 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | `ReceNo` int NOT NULL이 있으나 PK 제약 미설정 |
| JOIN | cust_num | char(13) | → SOFTCRM.CUSTOM.CUST_NUM (고객번호 체계 공유) |
| JOIN | workid / Dr_confirm / overhaul / basic / recovery / receipt | char(6)/varchar(6) | → SOFTCRM.EMPLOYEE.EMP_NUM |

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

- **별도 DB(MCRM)**: SOFTCRM 테이블과 JOIN하려면 크로스 DB 쿼리(`MCRM_WORK.dbo.Mh_Opdesk` 등) 필요.
- **PK/유니크 제약 없음(heap)**: `ReceNo` 중복을 DB가 막지 않는다.
- **`Cancel` 플래그**: 접수 취소 건 제외 시 `Cancel` 조건 확인 필수.

## 사용처

<!-- TODO: grep -r 'FROM Mh_Opdesk\|JOIN Mh_Opdesk' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
