# HOSPITAL_CFG

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: ~1 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HOSPITAL_CD | char(1) | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HOSPITAL_CD | char(1) | N | | PK |
| HOSPITAL_NM | nvarchar(20) | Y | |  |
| HOSPITAL_MODE | char(1) | Y | |  |
| HOSPITAL_POST | char(1) | Y | |  |
| HOSPITAL_CEO | nvarchar(20) | Y | |  |
| HOSPITAL_TAX_NO | varchar(10) | Y | |  |
| HOSPITAL_CP_NO | char(12) | Y | |  |
| HOSPITAL_TEL_NO | varchar(14) | Y | |  |
| HOSPITAL_ADDR | nvarchar(300) | Y | |  |
| Hospital_Code | nvarchar(50) | Y | |  |
| HOSPITAL_Ytb_ID | varchar(50) | Y | |  |
| HOSPITAL_Ytb_PW | varchar(50) | Y | |  |
| HspPwdMod | char(1) | Y | |  |
| Hospital_Serial | int | Y | |  |
| Hsp080Number | varchar(50) | Y | |  |

> 외 1개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HOSPITAL_CFG'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM HOSPITAL_CFG\|JOIN HOSPITAL_CFG' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
