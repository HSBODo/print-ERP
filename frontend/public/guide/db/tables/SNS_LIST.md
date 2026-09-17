# SNS_LIST

> **DB**: SOFTCRM | **컬럼**: 4개 | **행 수**: ~414 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

고객 SNS 계정 정보 테이블. 고객(`Cust_Num`)별 SNS 종류(`SNS_Code`)와 계정 ID를 보관하는 소규모 테이블 (~400행).

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | IDX | int | |
| JOIN | Cust_Num | char(13) | → CUSTOM.CUST_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| IDX | int | N | | PK |
| Cust_Num | char(13) | Y | |  |
| SNS_Code | char(3) | Y | |  |
| ID | varchar(50) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM SNS_LIST\|JOIN SNS_LIST' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
