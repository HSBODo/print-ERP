# HOSPITAL_CFG

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: 1 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

병원 설정 단일행 테이블. 병원명·대표자·사업자번호·연락처·주소 등 기본 정보와 `Hospital_Code`(주민번호 암호화 passphrase로 사용, [CUSTOM.md](./CUSTOM.md)의 `DECRYPTBYPASSPHRASE` 참조)를 보관한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | HOSPITAL_CD | char(1) | EMPLOYEE.HOSPITAL 등에서 참조 |

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

> 외 1개 컬럼: `Kakao` varchar(50) — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HOSPITAL_CFG'` 으로 전체 조회

## 함정 (Gotchas)

- **`Hospital_Code`는 암호화 passphrase**: CUSTOM.JUMIN_NUM 복호화(`DECRYPTBYPASSPHRASE`)에 사용된다. 값 변경 시 기존 암호화 데이터 전체를 못 읽게 되므로 절대 임의 수정 금지.
- **평문 자격증명 존재**: `HOSPITAL_Ytb_ID`/`HOSPITAL_Ytb_PW`(유튜브 계정)가 평문 저장 — 조회 결과를 로그·화면에 그대로 노출하지 말 것.

## 사용처

<!-- TODO: grep -r 'FROM HOSPITAL_CFG\|JOIN HOSPITAL_CFG' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
