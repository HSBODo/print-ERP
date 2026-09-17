# LENS

> **DB**: SOFTCRM | **컬럼**: 37개 | **행 수**: ~11,371 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

렌즈(드림렌즈 등) 처방/주문 기록 테이블. 고객당 복수 행(`CUST_NUM`+`SEQ`)으로 렌즈 구분(`LENS_GUBUN`)·종류(`LENS_KIND`)·주문일(`LENS_DATE`)·수령일(`LENS_RECV_DATE`)과 좌/우안 측정값(`RIGHT01~15`/`LEFT01~15`)을 보관한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | → CUSTOM.CUST_NUM |
| PK | SEQ | int | 고객 내 일련번호 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | | PK |
| SEQ | int | N | | PK |
| LENS_GUBUN | varchar(3) | Y | |  |
| LENS_KIND | varchar(3) | Y | |  |
| LENS_DATE | char(10) | Y | |  |
| LENS_RECV_DATE | char(10) | Y | |  |
| LENS_MEMO | nvarchar(1000) | Y | |  |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |
| RIGHT02 | nvarchar(20) | Y | |  |
| LEFT02 | nvarchar(20) | Y | |  |
| RIGHT03 | nvarchar(20) | Y | |  |
| LEFT03 | nvarchar(20) | Y | |  |
| RIGHT04 | nvarchar(20) | Y | |  |
| LEFT04 | nvarchar(20) | Y | |  |

> 외 22개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LENS'` 으로 전체 조회

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM LENS\|JOIN LENS' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
