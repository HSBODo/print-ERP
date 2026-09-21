# mh_java

> **DB**: MCRM | **컬럼**: 7개 | **행 수**: ~59,406 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블) | | |

<!-- TODO: FK, JOIN 키 추가 -->

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| cust_num | varchar(20) | N | |  |
| form_no | varchar(30) | N | |  |
| first_day | char(10) | Y | |  |
| cust_name | varchar(50) | Y | |  |
| privacy_yn | char(1) | Y | |  |
| ai_privacy_yn | char(1) | Y | |  |
| Seq | int | N | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM mh_java\|JOIN mh_java' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
