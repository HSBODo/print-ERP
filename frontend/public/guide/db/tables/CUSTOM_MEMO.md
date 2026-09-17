# CUSTOM_MEMO

> **DB**: SOFTCRM | **컬럼**: 3개 | **행 수**: ~242,665 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

고객 메모 히스토리 테이블. CUSTOM과 1:1(PK=`CUST_NUM`)로, 본문(`ETC`)을 **RTF 형식**으로 저장한다. CUSTOM.ETC(플레인텍스트 varchar(8000))와는 별개 저장소.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | CUST_NUM | char(13) | → CUSTOM.CUST_NUM (1:1) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| CUST_NUM | char(13) | N | 고객번호 | PK |
| ETC | varchar(max) | Y | 메모 본문 (RTF) | 표시 시 RTF → 플레인텍스트 변환 필요 |
| ETC_FLAG | char(1) | Y | 메모 플래그 |  |

## 함정 (Gotchas)

- **본문이 RTF 형식**: 프론트 표시 전 RTF → 플레인텍스트 변환 필요 ([CUSTOM.md](./CUSTOM.md) 함정 참조).
- **ETC는 varchar(max)**: 대형 값 존재 가능 — 목록 조회에서 본문 전체 SELECT 지양.

## 사용처

<!-- TODO: grep -r 'FROM CUSTOM_MEMO\|JOIN CUSTOM_MEMO' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
