# Airflow Dataloader 쿼리 분석 — 레거시 ETL ↔ 대시보드 대조

> **원본**: 별도 Airflow ETL 파이프라인(이 리포 코드 아님)의 데이터로더 8종.
> CRM MSSQL을 조회해 **일별 스냅샷 KPI**와 **비예약/바이럴 추적 리스트**를 뽑는다.
> `docs/airflow/*.py` 사본은 2026-08-05 정리 때 삭제했다 — 쿼리 조건·필터·함정은 아래 §2·§3 에 전부 옮겨져 있고,
> 원본 파일이 필요하면 Airflow ETL 리포에서 받는다(사본은 이 리포 git 이력에도 남아 있다).
>
> **이 문서를 언제 보나**: 레거시 Airflow 숫자와 대시보드 숫자가 안 맞을 때 → §5.
>
> 참조: `docs/db/tables/RESERVATION.md`, `EXAM.md`, `OPERATIONDATA.md`, `COSTPRICE.md`, `CUSTOM.md`.

## 📑 목차

- [1. 파일 한눈에 보기](#1-파일-한눈에-보기)
- [2. 코드/플래그 사전](#2-코드플래그-사전)
  - [2.1 RESERVE_FLAG](#21-reserve_flag--진료-유형-예약-대분류)
  - [2.2 RESERVE_STATE](#22-reserve_state--예약-라이프사이클-상태)
  - [2.3 RESERVE_JINRYO](#23-reserve_jinryo--진료-세부-유형)
  - [2.4 더미/테스트 배제 패턴](#24-더미테스트-고객-배제-패턴)
- [3. 파일별 상세](#3-파일별-상세)
  - [3.1 exam_count.py](#31-exam_countpy--시력교정-일일-검사-건수)
  - [3.2 operation_count.py](#32-operation_countpy--시력교정-일일-수술-건수)
  - [3.3 revenue.py](#33-revenuepy--시력교정-일일-매출)
  - [3.4 cataract_exam_count.py](#34-cataract_exam_countpy--백내장-일일-검사-건수)
  - [3.5 cataract_operation_count.py](#35-cataract_operation_countpy--백내장-일일-수술-건수)
  - [3.6 cataract_revenue.py](#36-cataract_revenuepy--백내장-일일-매출)
  - [3.7 non_reservation.py](#37-non_reservationpy--비예약수술-미예약-고객-목록)
  - [3.8 referral.py](#38-referralpy--바이럴-마케팅-유입-추적)
- [4. 지표 ↔ 대시보드 페이지 매핑](#4-지표--대시보드-페이지-매핑)
- [5. Airflow vs 대시보드 — 결과가 안 맞는 이유](#5-airflow-vs-대시보드--결과가-안-맞는-이유)
  - [5.0 전체 요약](#50-전체-요약)
  - [5.1 검사(Exam) 관점](#51-검사exam-관점)
  - [5.2 예약(Reservation) 관점](#52-예약reservation-관점)
  - [5.3 수술(Surgery) 관점](#53-수술surgery-관점)
    - [대시보드 내부: 수술자 리스트 vs 수술건수](#대시보드-내부-수술자-리스트-vs-수술건수)
      - [월별 관점 추가 요인](#월별-관점에서-추가로-격차를-만드는-요인)
  - [5.4 판단 체크리스트](#54-판단-체크리스트)

---

## 1. 파일 한눈에 보기

| # | 파일 | 지표 | 대상 테이블 | 반환 |
|---|------|------|-------------|------|
| 1 | `exam_count.py` | 시력교정 일일 검사 건수 | `RESERVATION` × `EXAM` × `CUSTOM` | `row_count` |
| 2 | `operation_count.py` | 시력교정 일일 수술 건수 | `RESERVATION` | `row_count` |
| 3 | `revenue.py` | 시력교정 일일 매출 | `OPERATIONDATA` × `COSTPRICE` × `CUSTOM` | `revenue` |
| 4 | `cataract_exam_count.py` | 백내장 일일 검사 건수 | `RESERVATION` × `CUSTOM` | `row_count` |
| 5 | `cataract_operation_count.py` | 백내장 일일 수술 건수 | `RESERVATION` | `row_count` |
| 6 | `cataract_revenue.py` | 백내장 일일 매출 | `Cataract_Operationdata` × `COSTPRICE` × `CUSTOM` | `revenue` |
| 7 | `non_reservation.py` | 비예약(수술미예약) 고객 목록 | `EXAM` × `RESERVATION` × `CUSTOM` × `AssignList_New` | DataFrame |
| 8 | `referral.py` | 바이럴 유입 추적 (가상계정/후기/다음카페) | 외부 SQL 파일 | DataFrame |

**공통 실행 패턴**

```python
target = to_date(data_interval_end) - timedelta(days=days_ago)
# ↑ Airflow data_interval_end - N일 = 대상 스냅샷 날짜(백필 지원)

with get_db_conn(get_crm_conn()) as conn:
    cursor.execute(sql, [target])          # 파라미터 바인딩 (?)
    df = pd.DataFrame(cursor.fetchall())
    return XxxSchema.validate(df)          # pandera 스키마 검증
```

---

## 2. 코드/플래그 사전

쿼리에서 반복적으로 등장하는 상수들을 한 곳에 정리. **같은 문자라도 위치(FLAG/STATE)에 따라 의미가 완전히 다르므로 주의.**

### 2.1 `RESERVE_FLAG` — 진료 유형 (예약 대분류)

`RESERVATION.RESERVE_FLAG` (char(1)) → `MEDICAL_TIME_CFG` FK.

| 값 | 의미 | 사용 파일 |
|----|------|-----------|
| `'m'` (소문자) | **시력교정 검사** | `exam_count.py` |
| `'H'` (대문자) | **백내장 검사** | `cataract_exam_count.py` |
| `'O'` | **수술 예약** (시력교정/백내장 공통) | `operation_count.py`, `cataract_operation_count.py` |
| `'D'` | (미상 — `non_reservation.py`에서 "수술예약 존재 판정"에 사용) | `non_reservation.py` |

> ⚠️ **대소문자 실수 = 결과 0건**. 시력교정 검사만 소문자다.

### 2.2 `RESERVE_STATE` — 예약 라이프사이클 상태

`RESERVATION.RESERVE_STATE` (char(1)).

| 값 | 의미 | 통계 처리 |
|----|------|-----------|
| `'Y'` | 예약(등록만 됨) | 상황별 포함/제외 |
| `'I'` | 접수 = **내원** | 실적 인정 |
| `'H'` | 퇴원 = **귀가**(진료 완료) | 실적 인정 |
| `'C'` | **취소** | **모든 실적 집계에서 제외 필수** |

> `exam_count.py` 는 `IN ('I','H')` 만 카운트(내원·귀가) → 이미 진료가 발생한 케이스.
> 수술/매출 계열은 `NOT IN ('C')` (취소만 배제).

### 2.3 `RESERVE_JINRYO` — 진료 세부 유형

`RESERVATION.RESERVE_JINRYO` (varchar(2)) → `MEDICAL_SUB_CFG` FK. **`RESERVE_FLAG` 와 조합해서 해석**해야 함(같은 숫자가 FLAG에 따라 다른 의미).

**`RESERVE_FLAG='m'` (시력교정 검사) 조합**

| JINRYO | 의미 |
|--------|------|
| `''` | 일반 검사 |
| `'2'` | 재검사 |
| `'5'` | 검사OP(수술전 검사) |
| `'7'` | 검사OP-Re(수술전 재검사) |
| `'16'` | 당일 재검사 |

→ `non_reservation.py` 의 검사 필터에서 이 5종을 사용.

**`RESERVE_FLAG='O'` (수술) 조합**

| JINRYO | 의미 |
|--------|------|
| `1` | 수술 |
| `2` | 당일OP |
| `4` | **백내장 수술** |
| `8` | 노안 수술 |

→ 시력교정 수술 = `(1,2,8)`, 백내장 수술 = `4`.

**`RESERVE_FLAG='H'` (백내장 검사) 조합**

| JINRYO | 의미 (`cataract_exam_count.py` 매핑) |
|--------|-------------------------------------|
| `1` | C_일반검사 |
| `2` | C_OP전검사 |
| `3` | C_재검사 (**집계 제외**) |
| `7` | C_원데이 |
| `10` | 단_OP전검사 |
| `12` | 외_OP전검사 |
| `13` | 수술당일 |
| `25` | 렌즈삽입_원데이 |

### 2.4 더미/테스트 고객 배제 패턴

| 조건 | 의미 |
|------|------|
| `CUST_NUM = '9999999999999'` | 워크인/가상 예약용 더미 |
| `CUST_NUM = '8888888888888'` | 임시/테스트 더미 |
| `LOWER(CUST_NAME) LIKE '%test%'` / `CUST_NAME LIKE '%테스트%'` | 이름 기반 테스트 계정 |
| `LOWER(COMMENT) LIKE '%IRRIGATION%'` | 재수술 관행 코멘트 — 수술 건수/매출에서 예외 처리 |

> ✅ **모든 신규 지표에도 동일 필터 적용 권장.**

---

## 3. 파일별 상세

### 3.1 `exam_count.py` — 시력교정 일일 검사 건수

**함수**: `get_daily_exam_count_result(data_interval_end, days_ago) → row_count`

**의도** — 특정일 시력교정 검사가 실제로 이뤄진 고객 수(내원+귀가).

**조건**

| 필터 | 값 | 이유 |
|------|-----|------|
| `E.EXAM_DATE = ?` (CAST as date) | 대상일 | 검사일 기준 |
| `R.RESERVE_FLAG` | `'m'` | 시력교정 검사 |
| `R.RESERVE_STATE` | `IN ('I','H')` | 내원·귀가만 |
| `E.CUST_NUM NOT IN` | `9999.../8888...` | 더미 제외 |
| `SELECT DISTINCT` | (검사일, 차트번호, 고객명, CANCEL_CD, 예약상태) | 다중 예약 중복 제거 |

**참고** — `CASE WHEN R.RESERVE_STATE='I' THEN '내원' ELSE '귀가' END` 로 표시하지만 카운트에는 두 상태 모두 포함.

---

### 3.2 `operation_count.py` — 시력교정 일일 수술 건수

**함수**: `get_daily_operation_count_result(...) → row_count`

**의도** — 특정일 시력교정 수술(취소 제외) 건수.

**조건**

| 필터 | 값 |
|------|-----|
| `RESERVE_DATE = ?` | 대상일 |
| `RESERVE_FLAG` | `'O'` |
| `RESERVE_STATE NOT IN` | `('C')` |
| `RESERVE_JINRYO IN` | `(1, 2, 8)` = 수술 / 당일OP / 노안 |
| `CUST_NUM <> '8888888888888'` | 더미 |
| `CUST_NAME` 필터 | `%test%`, `%테스트%` 제외 |
| `COMMENT` 필터 | `%IRRIGATION%` 제외 (재수술) |

---

### 3.3 `revenue.py` — 시력교정 일일 매출

**함수**: `get_daily_revenue_result(...) → revenue (float)`

**의도** — 특정일 시력교정 수술의 결제금액 합계. **백내장 고객은 완전히 배제**.

**핵심 JOIN**

```sql
OPERATIONDATA a
LEFT JOIN COSTPRICE c
  ON c.CUST_NUM = a.CUST_NUM
 AND c.COST_DATE = a.OPERATION_DATE
LEFT JOIN CUSTOM CU ON a.CUST_NUM = cu.CUST_NUM
WHERE a.OPERATION_DATE = ?
  AND a.CUST_NUM NOT IN (SELECT DISTINCT CUST_NUM FROM Cataract_Operationdata)
  AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NAME NOT LIKE '%테스트%')
```

**포인트**

- `SUM(CONVERT(float, c.COST_PRICE))` — 문자열 컬럼을 float 변환 후 합산.
- **백내장 이력 있는 고객은 시력교정 매출에서도 통째로 제외** — 두 종류 수술을 다 받은 고객의 시력교정 매출은 누락됨(설계 결정).
- NULL 방어: `df["revenue"] = pd.to_numeric(...).fillna(0.0)`.

---

### 3.4 `cataract_exam_count.py` — 백내장 일일 검사 건수

**함수**: `get_daily_cataract_exam_count_result(...) → row_count`

**의도** — 특정일 백내장 관련 검사 예약 수(재검사 `RESERVE_JINRYO='3'` 제외).

**조건**

| 필터 | 값 |
|------|-----|
| `RESERVE_DATE = ?` | 대상일 |
| `RESERVE_FLAG` | `'H'` (백내장) |
| `RESERVE_JINRYO <> '3'` | C_재검사 제외 |
| `RESERVE_STATE <> 'C'` | 취소 제외 |
| `NOT (RESERVE_FLAG='H' AND RESERVE_SEQ='3')` | 비즈니스 예외(원장실 검사?) |
| `CUST_NUM <> '9999999999999'` | 더미 |

**차이점** — 이 함수만 `to_date().strftime("%Y-%m-%d")` 로 명시적 문자열 변환. 다른 백내장 함수는 date 객체 그대로 전달.

---

### 3.5 `cataract_operation_count.py` — 백내장 일일 수술 건수

**함수**: `get_daily_cataract_operation_count_result(...) → row_count`

**조건**

| 필터 | 값 |
|------|-----|
| `RESERVE_FLAG` | `'O'` |
| `RESERVE_STATE NOT IN` | `('C')` |
| `RESERVE_JINRYO IN` | `(4)` = 백내장 |
| `RESERVE_DATE = ?` | 대상일 |
| 더미/테스트/IRRIGATION | 제외 |

---

### 3.6 `cataract_revenue.py` — 백내장 일일 매출

**함수**: `get_daily_cataract_revenue_result(...) → revenue (float)`

**핵심 JOIN — 좌·우안 각각 매칭**

```sql
Cataract_Operationdata co
LEFT JOIN COSTPRICE c
  ON c.CUST_NUM = co.CUST_NUM
 AND (c.COST_DATE = co.OPERATIONR_DATE OR c.COST_DATE = co.OPERATIONL_DATE)
LEFT JOIN CUSTOM cu ON co.CUST_NUM = cu.CUST_NUM
WHERE c.COST_DATE = ?
  AND (cu.CUST_NAME NOT LIKE '%TEST%' AND cu.CUST_NUM NOT LIKE '%테스트%')
```

**포인트**

- 좌안(`OPERATIONL_DATE`) / 우안(`OPERATIONR_DATE`) 이 다른 날 시행됐을 때 각각 매칭 가능.
- ⚠️ 원 코드의 `cu.CUST_NUM not like '%테스트%'` 는 **번호 컬럼에 한글 매칭** → 실질 무효. 원 저자 오타로 추정(`CUST_NAME` 이어야 함).
- 원데이 수술 COSTPRICE 이중 합산 이슈는 `docs/db/tables/COSTPRICE.md` 함정 참조.

---

### 3.7 `non_reservation.py` — 비예약(수술 미예약) 고객 목록

**두 개 함수**

| 함수 | 기간 | 반환 |
|------|------|------|
| `get_non_reservation_result()` | `GETDATE()-14 ~ GETDATE()` | 원본 스키마 (모두 문자열) |
| `get_non_reservation_for_sheet_result(run_date)` | `run_date-14 ~ run_date` | 시트 적재용(`CUST_NUM`/`CALL_NUM2` int + `생성일` 컬럼) |

**의도** — 시력교정 검사(EXAM)는 마쳤지만 아직 수술 예약을 잡지 않은 잠재 고객을 상담 워크리스트로 뽑음.

**로직 요약**

```
1. CTE RecentReservations: CUST_NUM별 최신 예약 1건 남김
   (ROW_NUMBER PARTITION BY CUST_NUM ORDER BY RESERVE_DATE DESC, rn=1)

2. EXAM e를 기준으로 CUSTOM, RecentReservations, AssignList_New 조인

3. 필터
   ├─ NOT EXISTS: RESERVE_FLAG IN ('O','H','D') 인 예약이 없어야 함  ← 수술/백내장 예약 없음
   ├─ AssignList_New.CounselorID != 'BS0808'                          ← 미지정 상담사 제외
   ├─ EXAM_DATE >= GETDATE() - 14                                     ← 최근 14일 검사
   ├─ EXAM.STOP_YN = 'N'                                              ← 검사 중단 아님
   ├─ RESERVE_JINRYO IN ('','2','5','7','16')                         ← 검사 계열만
   ├─ 만 19~40세 (BIRTH_DAY between -40Y and -19Y)
   └─ EXAM_DATE >= RecentReservations.RESERVE_DATE                    ← 재검 이후 검사만
```

**컬럼**: `CUST_NUM`, `CUST_NAME`, `EXAM_DATE`, `RESERVE_DATE`, `BIRTH_DAY`, `CALL_NUM2`, `EMAIL` (+ 시트본은 `생성일`).

**함정**

- `RESERVE_FLAG='D'` 의 의미가 코드에 없음 → `MEDICAL_TIME_CFG` 확인 필요(D = 데스크?).
- 시트본은 `CUST_NUM`/`CALL_NUM2` 를 int 캐스팅 → **선행 0 손실**(010→10). 재조회 시 문자열 매칭 실패 가능.
- 만 19~40세 필터는 월/일까지 정확히 만나이 계산은 아님(오차 최대 1년).

---

### 3.8 `referral.py` — 바이럴 마케팅 유입 추적

CRM 이 아닌 **외부 SQL 파일**(`sqls/customer/*.sql`, `sqls/referral/*.sql`)을 로드해 실행. 이 파일은 오케스트레이션 층.

| 함수 | 소스 | 설명 |
|------|------|------|
| `extract_virtual_account_master()` | `sqls/customer/extract_virtual_account_customers.sql` | 가상계정(소개용) 마스터 |
| `extract_virtual_account_referrals()` | `sqls/referral/extract_virtual_account_referrals_*.sql` | 가상계정이 소개한 고객의 검사/수술/매출 |
| `extract_review_participant_referrals(gs_repo, spreadsheet_id)` | Google Sheets + `sqls/referral/extract_review_participant_referrals_*.sql` | 후기 참여자가 소개한 고객 유입 |
| `extract_daum_cafe_referrals()` | `sqls/referral/extract_daum_cafe_referrals_*.sql` | 다음카페(여성시대) 유입 |

**후기참여자 매칭 플로우**

```
1. Google Sheets '후기참여' 시트 로드 (header_row=2)
2. 전화번호 정규화 (숫자만 추출)
3. CRM CUSTOM 과 (이름 + 전화번호) 완전 일치 조인
4. 매칭된 CUST_NUM 리스트를 SQL의 {{ review_participant_ids }} 자리에 치환
5. 검사/수술 SQL 실행 → 병합 & 시간순 정렬
```

**공통 후처리**

- `매출` 컬럼 `fillna(0).astype(int)`.
- 문자열 컬럼(`고객_차트번호`, `고객_이름`, `가상_차트번호`, `구분`, `수술_좌안/우안` 등) 트림.

**함정**

- 시트 헤더 위치(3번째 행) 하드코딩 → 시트 개편 시 실패.
- 이름 + 전화번호 매칭 → **동명이인**·번호 재사용 시 잘못된 매칭 위험.
- `{{ review_participant_ids }}` 는 `str.strip()` 후 quote 처리하지만 인젝션 관점 형식적 검토 권장(값이 사내 통제 CUST_NUM 이라 실무 위험은 낮음).

---

## 4. 지표 ↔ 대시보드 페이지 매핑

| Airflow 함수 | 대응 대시보드 페이지 |
|--------------|---------------------|
| `get_daily_exam_count_result` | `procedure-exam`, `overall-exam`, `overall-exam-weekly` |
| `get_daily_operation_count_result` | `surgery`, `surgery-composition`, `surgery-ratio` |
| `get_daily_revenue_result` | (매출 페이지 미구현) |
| `get_daily_cataract_exam_count_result` | `procedure-exam`(백내장 세션), `cataract-exam-list` |
| `get_daily_cataract_operation_count_result` | `surgery`(백내장 탭) |
| `get_daily_cataract_revenue_result` | (백내장 매출 미구현) |
| `get_non_reservation_*` | 상담 워크플로우 (프론트 미구현·시트 운영) |
| `extract_*_referrals` | `marketing`, `visit-reason` (pending) |

---

## 5. Airflow vs 대시보드 — 결과가 안 맞는 이유

같은 이름의 지표(검사·예약·수술)라도 두 시스템은 집계 로직이 다르다. 관점별로 정리.

### 5.0 전체 요약

| 관점 | Airflow | Dashboard | 안 맞는 핵심 |
|------|---------|-----------|--------|
| **검사** | `RESERVATION × EXAM` (예약 필수) | `EXAM` 단독 + 백내장 스텁 배제 | 워크인·백내장 배제·상태 필터 |
| **예약** | 지표 부재 (수술·검사 서브집합만) | 8+ 채널 funnel 통합 | 소스 자체가 다름 |
| **수술** | `RESERVATION.FLAG='O'` 예약 건수 | 실적 테이블 + 환자수/안수 | 예약 vs 실적, 카운트 단위 |

**공통 3대 축 차이**

| 축 | Airflow | Dashboard |
|----|---------|-----------|
| 기준 테이블 | `RESERVATION` (예약 시점) | 실적(`EXAM`/`OPERATIONDATA`/`Cataract_Operationdata`) + 채널 원천(CTI/TM/HappyTalk) |
| 기간 파라미터 | 하루(`? = 대상일`) | 기간(`:from ~ :to`) |
| 집계 단위 | `COUNT(*)` 예약/검사 건수 | 환자수 `DISTINCT cust_num` 또는 안수 `eye_key` |

---

### 5.1 검사(Exam) 관점

#### 시력교정 검사

**Airflow `exam_count.py`** vs **Dashboard `find-vision-correction-monthly.sql` / `find-exam-list.sql`**

```sql
-- Airflow: RESERVATION INNER JOIN EXAM (CUST_NUM 만으로 조인, 날짜 매칭 없음)
FROM RESERVATION R
JOIN EXAM E ON R.CUST_NUM = E.CUST_NUM
WHERE CAST(E.EXAM_DATE AS date) = ?
  AND R.RESERVE_FLAG = 'm' AND R.RESERVE_STATE IN ('I','H')
  AND E.CUST_NUM NOT IN ('9999...','8888...')

-- Dashboard: EXAM 단독 + 백내장 스텁 배제
FROM EXAM e JOIN CUSTOM cu ON ...
WHERE e.EXAM_DATE BETWEEN :from AND :to
  AND NOT (CUST_NAME LIKE %테스트%/%test%)
  AND NOT ( EXISTS Cataract_Exam AND [측정값 60개 전부 공란] )
```

**조건 대조**

| 항목 | Airflow | Dashboard |
|------|---------|-----------|
| 기준 테이블 | `RESERVATION × EXAM` (예약 필수) | `EXAM` 단독 |
| RESERVE_DATE ↔ EXAM_DATE 매칭 | ❌ (CUST_NUM 만) | (해당 없음) |
| `RESERVE_FLAG` | `= 'm'` 필수 | 필터 아님 |
| `RESERVE_STATE` | `IN ('I','H')` 필수 | 필터 아님 |
| 백내장 스텁 배제 | ❌ | ✅ Cataract_Exam + EXAM 측정값 60개 공란 |
| 테스트 배제 축 | `CUST_NUM` 더미 | `CUST_NAME` 문자열 |
| 날짜 파라미터 | 하루 | 기간 |
| 집계 단위 | `COUNT(*)` DISTINCT(검사일,차트,이름,CANCEL_CD,예약상태) | EXAM 행 수 |

**시나리오별 값 방향**

| 케이스 | Airflow | Dashboard | 큰 쪽 |
|--------|---------|-----------|-------|
| 워크인 검사(당일 예약 없음) | ❌ | ✅ | Dashboard |
| 다른 날 예약 있는 검사(오탐) | ✅ | ✅ | 같음 |
| 백내장 스텁 EXAM(측정값 전무) | ✅ | ❌ | Airflow |
| 이름 "홍길동테스트" | ✅ | ❌ | Airflow |
| RESERVE_STATE Y(예약만) 검사자 | ❌ | ✅ | Dashboard |
| RESERVE_STATE C(취소) 검사자 | ❌ | ✅ | Dashboard |
| 같은 날 예약 I·H 이중 검사자 | 2행 | 1행 | Airflow |

**결정적 원인 3가지**

1. **기준 테이블** — Airflow 는 예약 없으면 검사도 없다고 봄. Dashboard 는 EXAM 만 있으면 카운트.
2. **CUST_NUM 만으로 조인** — Airflow 는 `RESERVE_DATE ↔ EXAM_DATE` 매칭이 없어 다른 날 예약이 있는 사람의 대상일 검사가 포함(오탐 가능).
3. **백내장 스텁 배제** — Dashboard 만 갖고 있음.

**격차 특정 순서**: 워크인 → 백내장 스텁 → STATE Y/C → 같은 날 I·H 이중.

#### 백내장 검사

**Airflow `cataract_exam_count.py`** vs **Dashboard `find-cataract-monthly.sql`**

| 항목 | Airflow | Dashboard |
|------|---------|-----------|
| `RESERVE_STATE` | `<> 'C'` (Y·I·H 포함) | `IN ('I','H')` |
| `RESERVE_JINRYO` | `<> '3'` — **8종 포함** | `= '1'` — **C_일반검사 1종만** |
| SEQ 예외 | `NOT (FLAG='H' AND SEQ='3')` | 없음 |
| 더미 배제 | ✅ | ❌ |

**결정적 원인**: JINRYO 범위 차이. Airflow 는 백내장 관련 8종 전부, Dashboard 는 1종만 → **Airflow 값이 훨씬 크다**. STATE Y 포함 여부도 격차 유발.

---

### 5.2 예약(Reservation) 관점

**Airflow 에는 예약 지표가 없다.** `RESERVATION` 을 소스로 쓰지만 목적은 검사·수술의 서브셋 집계뿐.

**Dashboard 예약 지표 3계층**

- `reservation-overall/monthly.sql` — 월별 종합. `InsertedDateTime`(등록일) 기준, `FLAG='M'`, `RESERVE_PATH` 로 온라인/콜 분리.
- `reservation-stats/system-daily-counts.sql` — **8개 채널 funnel UNION**
  - CH_01 EICN 콜센터 · CH_03 CTI 통화 · CH_04 TM DB(`DB_CUSTOM`) · CH_05 TM 재상담(`DB_ReCounsel`)
  - CH_06 홈페이지(`RESERVE_HISTORY`, MEMO='예약저장') · CH_07/REJ 네이버(`RESERVATION_NAVER`) · CH_08 카카오톡(`HappyTalk_Counsel_List`) · CH_09 내원/취소/부도
- `reservation-stats/cataract-daily-counts.sql` — 백내장 전용 채널 조합. EICN `group_code='0016'`.

**Dashboard 만의 배제 마커 (12+ 종)**

```
CUST_NAME  %테스트%, %TEST%
COMMENT    %시뮬레이션%, %중복DB%, %중복예약%, %차트있음%, %재검%, %B2B(군인)%
CUSTOM.ETC %홍보실 가상계정%, %가상계정%, %가상데이터%, %시뮬레이션%
RESERVE_SEQ = '5' 또는 '8'
CUST_NUM   = '8888888888888'
```

**결과가 다른 이유**

1. **관점 부재** — Airflow 에 대응 지표 자체가 없음. 재현 불가.
2. **날짜 축** — Airflow(진료일 `RESERVE_DATE`) vs Dashboard(등록일 `InsertedDateTime` / `RESERVE_NUM` YYMMDD 파싱). 같은 예약도 다른 날짜에 집계.
3. **소스 다중화** — Dashboard 는 CTI/TM/네이버/카카오 시스템까지 UNION.
4. **홈페이지 예약 날짜 산출** — Dashboard 는 예약번호 YYMMDD 파싱으로 심야 온라인 예약이 배치로 다음날 밀리는 문제 회피.
5. **네이버 취소 판정** — Dashboard 는 `STATE='C'` 를 전부 사용자취소로 마킹(레거시 정합).
6. **배제 마커 스펙트럼** — 12+ 종 마커를 Dashboard 만 걸러냄.

---

### 5.3 수술(Surgery) 관점

Airflow 는 두 수술 건수 함수 모두 **`RESERVATION` 만** 참조하고, Dashboard 는 **실적 테이블**(`OPERATIONDATA` / `Cataract_Operationdata`) 을 참조한다.

**Airflow 수술 건수의 정확한 의미** (SQL 세부: [3.2](#32-operation_countpy--시력교정-일일-수술-건수) / [3.5](#35-cataract_operation_countpy--백내장-일일-수술-건수))

> **"대상일에 수술 예약(`FLAG='O'`) 이 잡혀 있고, 취소되지 않았으며, 수술 유형(`JINRYO` 시력교정 `(1,2,8)` / 백내장 `(4)`) 에 해당하는 예약의 개수"**

**Airflow ↔ Dashboard 카운팅 기준 대조**

| 항목 | Airflow | Dashboard 시력교정 | Dashboard 백내장 |
|------|---------|-------------------|-----------------|
| 소스 | `RESERVATION` (예약) | `OPERATIONDATA` (실적) | `Cataract_Operationdata` (실적) |
| 날짜 축 | `RESERVE_DATE` 예약일 | `OPERATION_DATE` 수술일 | `OPERATIONR/L_DATE` 좌·우 수술일 |
| 유형 판정 | `RESERVE_JINRYO` **코드** | `OPERATIONR/L` **시술명** LIKE (smile/lasik/lasek/icl/kpl/…) | 좌·우 각각 LIKE (catMulti/catMono/catEdof) |
| 집계 단위 | `COUNT(*)` 예약 건 | `COUNT(DISTINCT cust_num)` 환자수 | `COUNT(DISTINCT eye_key)` **안수**(양안=2) |
| 취소 처리 | `STATE NOT IN ('C')` | 실적이라 불필요 | 실적이라 불필요 |
| 미실시 예약(STATE=Y) | ✅ 포함 | ❌ | ❌ |
| 워크인(예약 없이 당일) | ❌ 누락 | ✅ 포함 | ✅ 포함 |
| 백내장 고객 배제(시력교정) | ❌ | ✅ `NOT EXISTS Cataract_Operationdata` | (해당 없음) |
| 양안 처리 | 예약 1건 = 1 | 환자당 1 (좌·우 무관) | 안수 (양안=2) |

**격차 방향 진단**

- **Airflow > Dashboard** → 미실시 예약(`STATE='Y'`) 이 많거나, 예약변경 후 다른 날 수술한 케이스가 많다.
- **Dashboard > Airflow (백내장)** → 양안 같은 날 수술이 많다(안수 2배 효과).
- **Dashboard > Airflow (시력교정)** → 워크인 수술이 있거나 `RESERVE_JINRYO` 오분류가 있다.

**Airflow 카운팅 특성 4가지**

1. **실제 수술 여부와 무관** — `STATE='Y'`(예약만 등록)도 포함.
2. **양안 개념 없음** — 예약 단위. 양안이든 편안이든 예약 1건 = 1.
3. **워크인 누락** — 예약 없이 당일 수술한 케이스는 `RESERVATION` 에 없음.
4. **`RESERVE_JINRYO` 오분류에 취약** — 예약 등록 시 유형 코드가 잘못되면 카운트 그룹이 바뀜.

#### 대시보드 내부: 수술자 리스트 vs 수술건수

같은 대시보드 안에서도 리스트(`find-surgery-list.sql`) 와 건수(`find-vision-monthly-by-type.sql`·`find-cataract-monthly-by-type.sql`) 는 **집계 단위가 다르다**.

| 관점 | 리스트 | 건수 |
|------|--------|------|
| 시력교정 | `OPERATIONDATA op` 행 그대로 (좌·우 한 행) | 좌·우 UNION 후 `COUNT(DISTINCT cust_num)` **환자수** |
| 백내장 | 좌·우 UNION 후 `GROUP BY (CUST_NUM, OPERATION_DATE)` → **(환자,날짜) 병합** | 좌·우 UNION 후 `COUNT(DISTINCT eye_key)` **안수** |

**값 차이가 나는 케이스**

| 시나리오 | 리스트 | 건수 | 원인 |
|---------|--------|------|-----|
| 시력교정 환자가 같은 달 다른 날 2회 수술 | **2행** | 1명 | 리스트=날짜별, 건수=환자별 |
| 시력교정 좌·우 다른 유형(우:라식·좌:라섹) | 1행 | 유형별 lasik=1·lasek=1, 총 `visionPatients=1` | **유형별 합 ≠ 총합** — 좌·우 다른 유형 시 유형별 컬럼 이중 카운트 |
| 백내장 양안 **같은 날** 수술 | **1행** | **2** | 리스트=(환자,날짜) 병합, 건수=안수 → **건수가 리스트의 2배** |
| 백내장 양안 다른 날 수술 | 2행 | 2 | 같음 |

**공식**

```
리스트 총합    = 시력교정 op 행 + 백내장 (환자,날짜) 병합 행
시력교정 건수  = COUNT(DISTINCT cust_num)  ≤ 리스트 시력교정 부분   (재수술 시 격차)
백내장 건수    = COUNT(DISTINCT eye_key)   ≥ 리스트 백내장 부분     (양안 동일일 시 격차)
```

**격차 특정 순서**: (1) 월 내 재수술 환자 수 → (2) 백내장 양안 동일일 수술 수 → (3) 좌·우 다른 유형 환자 수.

##### 월별 관점에서 추가로 격차를 만드는 요인

위 "집계 단위" 차이 위에 **월별 집계 자체가 추가로 유발하는 격차**가 있다.

**1. 월 경계 파싱 방식이 다름**

- 리스트: `WHERE op.OPERATION_DATE >= :from AND op.OPERATION_DATE <= :to` — **문자열 사전순** 비교
- 건수: `GROUP BY YEAR(op_date), MONTH(op_date)` — **`YEAR/MONTH` date 함수** (문자열 → date 암묵 변환)

→ **시각이 붙은 값**(`'2026-06-30 23:59'`)이나 비정형 데이터에서 문자열 비교와 date 함수가 서로 다른 달로 분류할 수 있음.

**2. 월 내 재수술만 격차 유발 — 월 간 재수술은 격차 없음**

한 환자가 시력교정 수술을 두 번 받은 경우:

| 시나리오 | 6월 리스트 | 6월 건수 | 7월 리스트 | 7월 건수 |
|---------|-----------|---------|-----------|---------|
| 같은 달(6/15, 6/25) 재수술 | 2행 | **1명** | 0 | 0 |
| 다른 달(6/15, 7/5) 재수술 | 1행 | 1명 | 1행 | 1명 |

→ 다른 달 재수술은 각 달에서 리스트=건수. **월 내 재수술만 격차 유발**.

**3. 월간 DISTINCT 리셋 → 연간 합산 시 이중 카운트**

건수는 `GROUP BY YEAR, MONTH` + `COUNT(DISTINCT cust_num)` → **월별로 DISTINCT 초기화**.

- 한 환자가 3·6·9월 수술 → 3월=1, 6월=1, 9월=1
- 월간 합산(3) ≠ 실제 환자수(1)
- 리스트는 실적 행이라 자연스럽게 3행 → 연간 3

→ **월별 개별 비교는 이상 없지만, "월별 건수 합 vs 연간 리스트" 는 다른 이유로 격차**.

**4. 백내장 양안 시간차 수술 (다른 달 걸침)**

우안 6/25 + 좌안 7/3 수술 예시:

| 관점 | 6월 | 7월 |
|------|-----|-----|
| 리스트 | 1행 (6/25) | 1행 (7/3) |
| 건수 | 1 (우안) | 1 (좌안) |

→ **월 개별로는 격차 없음**. 각 달에 리스트·건수 모두 1씩.

**5. 통합 리스트 vs 분리 건수 (프론트 조합)**

- 리스트 API 는 시력교정 + 백내장 통합 반환.
- 건수 API 는 시력교정·백내장 **분리 호출**.
- 프론트가 두 값을 조합하는 방식에 따라 격차 발생.

**6. 리스트 페이지네이션 vs 총합**

프론트가 페이지네이션 적용 시 "현재 페이지 행 수" 와 "백엔드 total" 이 다를 수 있음. 어느 쪽을 건수와 비교했는지 확인 필요.

##### 월별 격차 원인 우선순위

| 순위 | 원인 | 발생 빈도 |
|------|------|-----------|
| 1 | 월 내 재수술 (시력교정) | 자주 |
| 2 | 백내장 양안 동일일 수술 | 매우 자주 |
| 3 | 좌·우 다른 유형 이중 카운트 (유형별 컬럼 합) | 종종 |
| 4 | 월 경계 파싱 방식 (시각 붙은 값·비정형 데이터) | 데이터 이상 시 |
| 5 | 연간 합산 방식 (월별 DISTINCT 합 vs 연간 리스트) | 연간 지표 볼 때 |
| 6 | 통합/분리 API 조합 (프론트) | 프론트 구현 따라 |

##### 진단 SQL

**월 내 재수술 환자 수 (시력교정)**

```sql
SELECT YEAR(OPERATION_DATE) AS yr, MONTH(OPERATION_DATE) AS mo,
       COUNT(*) - COUNT(DISTINCT CUST_NUM) AS 재수술_초과분
FROM OPERATIONDATA
WHERE OPERATION_DATE >= :from AND OPERATION_DATE <= :to
  AND NOT EXISTS (SELECT 1 FROM Cataract_Operationdata
                  WHERE CUST_NUM = OPERATIONDATA.CUST_NUM)
GROUP BY YEAR(OPERATION_DATE), MONTH(OPERATION_DATE);
```

**백내장 양안 동일일 수술 수**

```sql
SELECT YEAR(OPERATIONR_DATE) AS yr, MONTH(OPERATIONR_DATE) AS mo,
       COUNT(*) AS 양안동일일
FROM Cataract_Operationdata
WHERE OPERATIONR_DATE = OPERATIONL_DATE
  AND OPERATIONR_DATE >= :from AND OPERATIONR_DATE <= :to
GROUP BY YEAR(OPERATIONR_DATE), MONTH(OPERATIONR_DATE);
```

---

### 5.4 판단 체크리스트

값이 다를 때 다음 순서로 원인 특정:

1. **관점** — 검사·예약·수술 중 어느 축? Airflow 는 예약 관점 지표 없음.
2. **기준 테이블·날짜 축** — `RESERVATION`(예약일) vs `EXAM`/`OPERATIONDATA`(진료/수술일). 예약 지표는 `InsertedDateTime`/`RESERVE_NUM YYMMDD` 등 등록일 계열도 있음.
3. **집계 단위** — 예약건 / 환자수(DISTINCT cust_num) / 안수(eye_key).
4. **RESERVE_STATE 처리** — `IN ('I','H')` 인가 `NOT IN ('C')` 인가. Y(예약만) 포함 여부.
5. **JINRYO 범위** — 특히 백내장 검사에서 크게 갈림(1종 vs 8종).
6. **채널·배제 마커** — 예약 지표는 CTI/TM/HappyTalk/RESERVATION_NAVER 까지 볼 것. Dashboard 만 12+ 종 마커를 걸러냄. 시력교정 지표에서는 Dashboard 만 백내장 고객 배제.
