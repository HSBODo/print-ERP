# MOTIVE_NEW02

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: ~576,433 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

내원동기 상세 분류 테이블 ([MOTIVE_NEW01](./MOTIVE_NEW01.md)의 하위). 내원동기를 `category01~03`(대/중/소) 분류 체계로 기록하며, `Idx='1'`이 주 동기다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | pkey | int | |
| FK → | fkey | int | NOT NULL → MOTIVE_NEW01.pkey (`IX_MOTIVE_NEW02_fkey_Idx` 인덱스 있음) |
| JOIN | cust_num | nvarchar(23) | → CUSTOM.CUST_NUM. 실제 쿼리에서 fkey JOIN과 cust_num JOIN이 혼재 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | | PK |
| fkey | int | N | |  |
| cust_num | nvarchar(23) | Y | |  |
| cust_name | nvarchar(100) | N | |  |
| category01_key | int | Y | |  |
| category01_name | nvarchar(50) | N | |  |
| category02_key | int | Y | |  |
| category02_name | nvarchar(100) | Y | |  |
| code | nvarchar(20) | Y | |  |
| name | nvarchar(100) | N | |  |
| section | smallint | Y | |  |
| Idx | char(1) | Y | |  |
| category03_key | int | Y | |  |
| category03_name | nvarchar(50) | Y | |  |
| OldUniqueNum | nvarchar(23) | Y | |  |

> 외 1개 컬럼: `FKEY_OLD` int — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MOTIVE_NEW02'` 으로 전체 조회

## 함정 (Gotchas)

- **`Idx='1'`이 주 동기**: 한 고객(fkey)에 분류 행이 여러 개 달릴 수 있으므로, 주 동기만 볼 때는 `Idx = '1'` 필터 필수 ([MOTIVE_NEW01.md](./MOTIVE_NEW01.md) 대표 조회 예시 참조).
- **JOIN 키 혼재**: 정석은 `fkey → MOTIVE_NEW01.pkey`지만 기존 쿼리에는 `cust_num` JOIN도 혼재. cust_num은 nvarchar(23)로 CUSTOM.CUST_NUM(char(13))과 타입이 다르다.

## 사용처

<!-- TODO: grep -r 'FROM MOTIVE_NEW02\|JOIN MOTIVE_NEW02' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
