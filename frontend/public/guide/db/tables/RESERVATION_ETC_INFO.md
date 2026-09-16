# RESERVATION_ETC_INFO

> **DB**: SOFTCRM | **컬럼**: 16개 | **행 수**: ~29,238 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조 — 컬럼 6개 추가 반영)

## 역할

예약 부가정보 테이블 (RESERVATION과 1:1). 온라인 예약 설문(렌즈 착용/질환/문의), UTM 유입 정보, 소개자 코드(`rei_Recommender`)에 더해 상담 메모·좌/우 수술 상담 결과(`rei_consult_*`)를 보관한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | rei_noid | int | |
| JOIN | rei_reserve_num | varchar(50) | → RESERVATION.RESERVE_NUM. ⚠️ 타입 불일치 (char(22) vs varchar(50)) |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| rei_noid | int | N | | PK |
| rei_lens_chk | varchar(1000) | Y | 렌즈 착용 체크 |  |
| rei_question | varchar(1000) | Y | 문의 내용 |  |
| rei_disease | varchar(1000) | Y | 질환 정보 |  |
| rei_departure | varchar(1000) | Y | |  |
| rei_reserve_num | varchar(50) | Y | 예약번호 | RESERVATION JOIN 키 |
| rei_today_operation_chk | bit | Y | 당일수술 희망 여부 |  |
| rei_last_use_lens_day | varchar(20) | Y | 마지막 렌즈 착용일 |  |
| rei_UTM | varchar(100) | Y | UTM 유입 파라미터 |  |
| rei_Recommender | varchar(20) | Y | 소개자 코드 |  |
| rei_consult_exam_memo | nvarchar(max) | Y | 검사 상담 메모 | 2026-04-20 이후 추가 |
| rei_consult_memo | nvarchar(max) | Y | 상담 메모 | 〃 |
| rei_consult_surgery_r | nvarchar(60) | Y | 우안 상담 수술명 | 〃 |
| rei_consult_price_r | int | Y | 우안 상담 수가 | 〃 |
| rei_consult_surgery_l | nvarchar(60) | Y | 좌안 상담 수술명 | 〃 |
| rei_consult_price_l | int | Y | 좌안 상담 수가 | 〃 |

## 함정 (Gotchas)

- **rei_reserve_num 타입 불일치**: varchar(50) — RESERVATION.RESERVE_NUM(char(22))과 JOIN 시 트레일링 공백/형변환 주의.
- **컬럼 6개 신규 추가 (rei_consult_*)**: 2026-04-20 문서화 이후 스키마가 확장됨 (2026-08-10 실측 확인). 상담 메모 2개는 nvarchar(max) — 목록 조회에서 SELECT 지양.

## 사용처

<!-- TODO: grep -r 'FROM RESERVATION_ETC_INFO\|JOIN RESERVATION_ETC_INFO' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
