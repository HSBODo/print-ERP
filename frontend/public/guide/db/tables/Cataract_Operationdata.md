# Cataract_Operationdata

> **DB**: SOFTCRM | **컬럼**: 144개 | **행 수**: ~5,537 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

백내장 수술 데이터 테이블. 좌/우안 별도 수술일(`OPERATIONR_DATE`/`OPERATIONL_DATE`)·수술의(`OPERATIONR_DOC`/`OPERATIONL_DOC`, 2차 `OperationR_Doc2`/`OperationL_Doc2`)·스태프(`OpREmp1~3`/`OpLEmp1~3`) 구조. 시력교정 `OPERATIONDATA`와 UNION하여 전체 수술 통계를 산출한다 ([OPERATIONDATA.md](./OPERATIONDATA.md) 참조).

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블) | | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | |  |
| OPERATIONR_DATE | char(10) | Y | |  |
| OPERATIONL_DATE | char(10) | Y | |  |
| OPERATIONR | nvarchar(40) | Y | |  |
| OPERATIONL | nvarchar(40) | Y | |  |
| OPERATIONR_DOC | nchar(6) | Y | |  |
| OPERATIONL_DOC | nchar(6) | Y | |  |
| OPERATIONR_TODAY_YN | char(1) | Y | |  |
| OPERATIONL_TODAY_YN | char(1) | Y | |  |
| MOTIVE_EMP_NUM | char(6) | Y | |  |
| OPERATION_MEMO | nvarchar(1000) | Y | |  |
| RIGHT01 | nvarchar(20) | Y | |  |
| LEFT01 | nvarchar(20) | Y | |  |
| RIGHT02 | nvarchar(20) | Y | |  |
| LEFT02 | nvarchar(20) | Y | |  |

> 외 129개 컬럼 — `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Cataract_Operationdata'` 으로 전체 조회

## 함정 (Gotchas)

- **PK 없음(heap) + CUST_NUM 유일하지 않음**: WORK 실측(2026-08-10) 총 5,537행 / 고유 고객 5,459 (**중복 78건**). OPERATIONDATA(PK=CUST_NUM, 고객당 1행)와 달리 고객당 복수 행이 존재할 수 있으므로 "고객당 1행" 가정 금지.
- **좌/우안 수술일이 별도 컬럼**: 수술일 기준 집계 시 `OPERATIONR_DATE`·`OPERATIONL_DATE` 양쪽을 모두 고려해야 한다 (한쪽만 있는 행, 양쪽 날짜가 다른 행 존재 가능).

## 사용처

<!-- TODO: grep -r 'FROM Cataract_Operationdata\|JOIN Cataract_Operationdata' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
