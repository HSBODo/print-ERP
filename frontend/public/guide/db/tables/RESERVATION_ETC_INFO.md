# RESERVATION_ETC_INFO

> **DB**: SOFTCRM | **컬럼**: 10개 | **행 수**: ~28,413 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | rei_noid | int | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| rei_noid | int | N | | PK |
| rei_lens_chk | varchar(1000) | Y | |  |
| rei_question | varchar(1000) | Y | |  |
| rei_disease | varchar(1000) | Y | |  |
| rei_departure | varchar(1000) | Y | |  |
| rei_reserve_num | varchar(50) | Y | |  |
| rei_today_operation_chk | bit | Y | |  |
| rei_last_use_lens_day | varchar(20) | Y | |  |
| rei_UTM | varchar(100) | Y | |  |
| rei_Recommender | varchar(20) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM RESERVATION_ETC_INFO\|JOIN RESERVATION_ETC_INFO' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
