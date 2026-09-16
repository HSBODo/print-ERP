# RFCARD_LIST

> **DB**: SOFTCRM | **컬럼**: 10개 | **행 수**: ~317,471 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조 — 기존 ~82,819에서 대폭 증가)

## 역할

RF카드 체크(태그) 이력 테이블. 고객(`CUST_NUM`)이 리더기(`READER_CD`)에 태그한 일시(`CHECK_DATE`/`CHECK_TIME`)와 진료유형(`RESERVE_FLAG`)·담당의(`CHECK_DOC`)·담당 직원(`CHECK_EMP`)·유닛(`UNIT_CD`)을 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int | |
| JOIN | CUST_NUM | char(13) | NOT NULL → CUSTOM.CUST_NUM |
| JOIN | CHECK_DOC / CHECK_EMP | char(6) | → EMPLOYEE.EMP_NUM |
| JOIN | RESERVE_FLAG | char(1) | NOT NULL → MEDICAL_TIME_CFG.RESERVE_FLAG |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| IDX | int | N | | PK |
| CUST_NUM | char(13) | N | |  |
| RESERVE_FLAG | char(1) | N | |  |
| CHECK_DATE | char(10) | N | |  |
| CHECK_TIME | char(5) | N | |  |
| READER_CD | char(3) | N | |  |
| CHECK_DOC | char(6) | Y | |  |
| CHECK_EMP | char(6) | Y | |  |
| UNIT_CD | char(3) | Y | |  |
| SavedProgram | nvarchar(50) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RFCARD_LIST\|JOIN RFCARD_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
