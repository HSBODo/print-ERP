# mh_java

> **DB**: MCRM | **컬럼**: 7개 | **행 수**: ~59,408 (MCRM_WORK DB 기준)
> **최종 갱신**: 2026-08-10 (MCRM_WORK DB 실측 대조)

## 역할

고객별 폼/동의서 제출 기록 테이블. 폼 번호(`form_no`)별로 개인정보 동의(`privacy_yn`)·AI 활용 동의(`ai_privacy_yn`) 여부와 등록일(`first_day`)을 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | `cust_num`+`form_no`+`Seq` 모두 NOT NULL이나 제약 미설정 |
| JOIN | cust_num | varchar(20) | → SOFTCRM.CUSTOM.CUST_NUM. ⚠️ 타입 불일치 (char(13) vs varchar(20)) |

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

- **별도 DB(MCRM)**: SOFTCRM 테이블과 JOIN하려면 크로스 DB 쿼리 필요.
- **cust_num 타입 불일치**: varchar(20) — CUSTOM.CUST_NUM(char(13))과 JOIN 시 형변환 주의.

## 사용처

<!-- TODO: grep -r 'FROM mh_java\|JOIN mh_java' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
