# PTNTSIGN_New

> **DB**: IPLUS | **컬럼**: 19개 | **행 수**: ~104,941 (IPLUS_WORK DB 기준)
> **최종 갱신**: 2026-08-10 (IPLUS_WORK DB 실측 대조 — 컬럼 2개 추가 반영)

## 역할

IPLUS(EMR 계열) 환자 서명/동의 테이블. 병원코드(`HOSPCODE`)·환자번호(`PTNTIDNO`) 단위로 동의 항목(`Agree1~4`, `Agree10~11`, `AI_1`/`AI_2`)과 서명 이미지(`Sign1`/`Sign2`), 환자 인적사항(`pNm`/`pHpp`/`pBith`)을 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | |
| JOIN | PTNTIDNO | varchar(15) | 환자번호 — CRM 고객번호와 **같은 번호를 공유**하나 타입·패딩이 다름(varchar(15) vs char(13)). `RTRIM(PTNTIDNO) = RTRIM(CUST_NUM)` 패턴으로 매칭 (드림렌즈 장부 초안 SQL의 PAOSUNAB 조인과 동일 체계) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| HOSPCODE | varchar(2) | N | |  |
| REGDATE | varchar(10) | N | |  |
| PTNTIDNO | varchar(15) | N | |  |
| Agree2 | smallint | N | |  |
| Agree3 | smallint | N | |  |
| Agree4 | smallint | N | |  |
| AI_1 | smallint | N | |  |
| AI_2 | smallint | N | |  |
| Sign1 | text(2147483647) | Y | |  |
| Sign2 | text(2147483647) | Y | |  |
| pNm | varchar(40) | N | |  |
| pHpp | varchar(13) | N | |  |
| pFm | varchar(20) | N | |  |
| pBith | varchar(20) | N | |  |
| ADDTDATE | datetime | Y | |  |

> 외 4개 컬럼: `Agree1` smallint NOT NULL, `pMt` int, `Agree10`·`Agree11` smallint(2026-04-20 이후 추가) — `SELECT COLUMN_NAME, DATA_TYPE FROM IPLUS_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PTNTSIGN_New'` 으로 전체 조회

## 함정 (Gotchas)

- **컬럼 2개 신규 추가 (`Agree10`, `Agree11`)**: 2026-04-20 문서화 이후 스키마가 확장됨 (2026-08-10 실측 확인). 다른 Agree 컬럼과 달리 NULL 허용.
- **`Sign1`/`Sign2`는 레거시 `text` 타입**: 신규 코드에서 다룰 때 varchar(max) 캐스팅 주의. 서명 이미지라 목록 조회에서 SELECT 지양.
- **별도 DB(IPLUS)**: 원무·수납(EMR 계열) 시스템 DB — 운영은 `[220.85.109.240].IPLUS` 링크드서버 경유, 분석은 `IPLUS_WORK` 사본. `PTNTIDNO`는 CRM `CUST_NUM`과 같은 번호 체계이나 타입이 달라 **RTRIM 매칭 필수** (별개 체계로 오해하지 말 것 — 2026-08-12 드림렌즈 장부 PAOSUNAB 조인으로 확인).

## 사용처

<!-- TODO: grep -r 'FROM PTNTSIGN_New\|JOIN PTNTSIGN_New' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
