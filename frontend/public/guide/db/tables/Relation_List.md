# Relation_List

> **DB**: SOFTCRM | **컬럼**: 4개 | **행 수**: ~9,879 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

고객 간 관계 테이블. 고객(`Cust_num`)과 관계 고객(`Relation_Cust_num`)을 관계명(`Relation_Name`, 가족/지인 등)으로 연결한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | `pkey` int NOT NULL이 있으나 PK 제약 미설정 |
| JOIN | Cust_num / Relation_Cust_num | nvarchar(50) | → CUSTOM.CUST_NUM. ⚠️ 타입 불일치 (char(13) vs nvarchar(50)) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | |  |
| Cust_num | nvarchar(50) | Y | |  |
| Relation_Cust_num | nvarchar(50) | Y | |  |
| Relation_Name | nvarchar(50) | Y | |  |

## 함정 (Gotchas)

- **Cust_num 타입 불일치**: nvarchar(50) — CUSTOM.CUST_NUM(char(13))과 JOIN 시 암시적 형변환 주의.
- **PK 제약 없음(heap)**: `pkey`가 있으나 제약이 걸려 있지 않아 중복 삽입을 DB가 막지 않는다.

## 사용처

<!-- TODO: grep -r 'FROM Relation_List\|JOIN Relation_List' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
