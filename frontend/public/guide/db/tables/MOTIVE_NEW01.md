# MOTIVE_NEW01

> **DB**: SOFTCRM | **컬럼**: 32개 | **행 수**: ~499,127 (WORK DB 기준)
> **최종 갱신**: 2026-04-20

## 역할

소개고객/내원동기 마스터 테이블 (1차 소개자). 환자가 어떤 경로로 내원했는지(소개, 광고, 검색 등)와 소개자 정보를 기록한다.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | pkey | int (IDENTITY) | 자동 증가 PK |
| JOIN | cust_num | nvarchar(23) | 피소개자(내원 환자) 고객번호. CUSTOM.CustNum과 JOIN |
| JOIN | recommender02_code | nvarchar(50) | **주 소개자 고객번호** — 특정 고객이 소개한 환자 목록 조회 시 사용 |
| ← FK | MOTIVE_NEW02.fkey | int | 내원동기 상세 분류 테이블이 pkey를 참조 |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | PK (IDENTITY) | PK |
| cust_num | nvarchar(23) | N | **피소개자** 고객번호 (내원한 환자) | CUSTOM.CustNum JOIN |
| cust_name | nvarchar(100) | N | 피소개자 이름 | |
| regist_emp_code01 | nvarchar(10) | Y | 등록 직원 코드 1 | EMPLOYEE.EMP_NUM |
| regist_emp_name01 | nvarchar(20) | N | 등록 직원 이름 1 | |
| regist_emp_code02 | nvarchar(10) | Y | 등록 직원 코드 2 | |
| regist_emp_name02 | nvarchar(20) | N | 등록 직원 이름 2 | |
| regist_date01 | nvarchar(10) | Y | 등록일 1 | |
| regist_date02 | nvarchar(10) | Y | 등록일 2 | |
| comments | nvarchar(500) | N | 코멘트 | |
| recommender01 | nvarchar(50) | Y | 추천인1 이름 | |
| recommender02 | nvarchar(100) | Y | **주 소개자 이름** | 이름과 달리 02가 메인 |
| recommender02_code | nvarchar(50) | Y | **주 소개자 고객번호** | 소개고객 조회의 핵심 키 |
| recommender03 | nvarchar(50) | Y | 추천인3 이름 | |
| motive01~motive10 | nvarchar(50) | Y | 내원동기 분류 코드 | |
| recommender01_code | nvarchar(50) | Y | 추천인1 고객번호 | |
| recommender03_code | nvarchar(50) | Y | 추천인3 고객번호 | |
| recommender03_hp | nvarchar(20) | Y | 추천인3 전화번호 | |
| recommender04 | nvarchar(50) | Y | 추천인4 이름 | |
| recommender04_code | nvarchar(50) | Y | 추천인4 고객번호 | |

> 전체 컬럼은 `SELECT COLUMN_NAME, DATA_TYPE FROM SOFTCRM_WORK.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MOTIVE_NEW01'` 으로 조회

## 함정 (Gotchas)

- **`recommender02_code`가 주 소개자 코드** — 이름과 달리 `01`이 아닌 `02`가 메인 소개자 필드다. INSERT 시에도 `recommender02`, `recommender02_code`만 기록한다.
- **cust_num은 피소개자(내원 환자)** — 소개자가 아니다. 특정 고객이 소개한 환자 목록을 조회하려면 `WHERE recommender02_code = '소개자번호'`를 사용한다.
- **`IX_MOTIVE_NEW01_cust_name` 인덱스 추가됨** — 2026-04-08 DB 성능 P2 작업으로 WORK DB에 추가. PROD는 오너 수동 실행 대기 중.
- **`IX_MOTIVE_NEW02_fkey_Idx` 인덱스** — MOTIVE_NEW02.fkey에 인덱스 추가로 예약리콜 p95 7.14s -> 764ms (-89%) 개선.
- **MOTIVE_NEW02와 JOIN 시 `cust_num` 기반** — `MOTIVE_NEW02.fkey → MOTIVE_NEW01.pkey` FK가 있지만, 실제 쿼리에서는 `cust_num` JOIN도 혼재. `Idx = '1'`이 주 동기.

## 사용처

### EyeChartPro (Node.js)

| 파일 | 용도 | R/W |
|------|------|-----|
| `services/customer-visit-motive-service.js` | 내원동기 CRUD (조회/삭제/삽입) | R/W |
| `services/customer-etc-panels-service.js` | 고객 소개고객 패널 조회 | R |
| `services/recall-service.js` | 리콜 목록에서 소개자 정보 표시 | R |
| `services/recall-surgery-service.js` | 수술 리콜에서 소개자 정보 표시 | R |
| `routes/referral.js` | 소개고객관리 페이지 | R |
| `routes/referral-vip.js` | VIP 소개고객 관리 + 소개 실적 조회 | R |
| `routes/b2b-corp-reservation.js` | B2B 기업 예약 목록 (소개자 JOIN) | R |
| `routes/b2b-corp-cataract-reservation.js` | B2B 백내장 예약 (소개자 JOIN) | R |
| `routes/b2b-corp-surgery-patient.js` | B2B 수술자 목록 (소개자 JOIN) | R |
| `routes/b2b-corp-settlement.js` | B2B 기업 정산 (소개 경로 필터) | R |
| `routes/b2b-military-settlement.js` | B2B 군인 정산 | R |
| `routes/b2b-military-reservation.js` | B2B 군인 예약 | R |
| `routes/dreamlens-staff-referral.js` | 드림렌즈 직원 소개 실적 | R |
| `routes/surgery-schedule.js` | 수술 스케줄 (소개자 표시) | R |
| `routes/outpatient-counseling.js` | 외래 상담 (소개 경로) | R |
| `routes/stats-b2b-payment.js` | B2B 매출 통계 | R |
| `routes/vip.js` | VIP 목록 (소개자 JOIN) | R |
| `routes/point-staff.js` | 직원 포인트 (소개자 JOIN) | R |
| `routes/customer-qa.js` | 고객 QA 패널 조회 | R |

### EyeChartPro Backend (Java)

| 파일 | 용도 | R/W |
|------|------|-----|
| (해당 없음 — Node.js 전용 프로젝트) | | |

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md) — 전체 지도
- [db-referral.md](../db-referral.md) — 소개고객/내원동기 상세 매핑 (MOTIVE_NEW01 + MOTIVE_NEW02)
- [MOTIVE_NEW02.md](./MOTIVE_NEW02.md) — 내원동기 상세 분류 (하위 테이블)

## 대표 조회 예시

```sql
-- 특정 고객이 소개한 환자 목록 조회
SELECT m.cust_num, m.cust_name, m.recommender02, m.regist_date01
FROM MOTIVE_NEW01 m WITH(NOLOCK)
WHERE m.recommender02_code = @referrerCustNum
ORDER BY m.regist_date01 DESC

-- 예약 목록에서 소개자 정보 JOIN (가장 흔한 패턴)
SELECT r.*, m.recommender02 AS referrer_name
FROM RESERVATION r
LEFT JOIN MOTIVE_NEW01 m ON r.CUST_NUM = m.CUST_NUM

-- 내원동기 분류와 함께 조회 (MOTIVE_NEW02 JOIN)
SELECT b.category01_name + '/' + b.category02_name AS motive,
       a.recommender02, a.cust_num
FROM MOTIVE_NEW01 a WITH(NOLOCK)
JOIN MOTIVE_NEW02 b WITH(NOLOCK) ON a.cust_num = b.cust_num
WHERE b.Idx = '1'
```
