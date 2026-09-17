# Postgres 마트 인벤토리

작성일: 2026-08-13  
프로파일: `postgres-mart` (운영 표준)  
JDBC: `martJdbcTemplate` (Postgres) — 화면 조회는 여기만 사용

이 문서는 `backend/src/main/resources/sql/mart/V*.sql` 마이그레이션이 만드는 모든 테이블·뷰와 JPA 엔티티가 만드는 테이블을 도메인별로 정리한다. 각 항목의 **용도** · **원천/적재 경로** · **주요 컨슈머** 를 한눈에.

---

## 총계

| 종류 | 개수 |
|---|---|
| 마트 테이블 (`mart_*`, `list_*`, 기타 관리 테이블) | 32 |
| 마트 뷰 (`v_*`) | 3 |
| JPA 테이블 | 3 |
| **합계** | **38** |

원천 외부 DB 는 별도 — 외부 DB 3종(MSSQL 운영·MariaDB 홈페이지·MSSQL 아이리더)에서 총 **25개** 테이블을 읽음. primary list 마트 조립에는 그중 MSSQL 운영 19개 + MariaDB 홈페이지 1개 = **20개** 사용 (아래 "외부 DB 원본 매핑" 절 참조).

---

## 1. 공용 배치 인프라

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `batch_run_log` | TABLE | V1 | 관리자 > 데이터 배치 관리 · (전 페이지 헤더의 배치 성공 시각) | 배치 실행 이력 (run_type · status · table_stats). `/admin/batch` 페이지 및 화면의 `useBatchLastSuccess` 훅 소스. |
| `batch_watermark` | TABLE | V1 | — (배치 내부용) | 각 도메인 잡의 최종 성공 시점 저장 — 감사 로그 (`BatchSuccessLogRepository.upsert` 만 호출, 매일 D-1 고정 처리라 다음 배치 시작점 결정에는 미사용). |

---

## 2. 수술 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_surgery_monthly` | TABLE | V2 | 수술 > 수술 건수 · 리포트 > 월간 레포트 | 시력교정·백내장·전체 월별 수술 건수. **수술 건수 페이지** 및 월간 레포트 소스. |
| `mart_surgery_daily` | TABLE | V2 | 수술 > 수술별 비중 · 리포트 > 주차 레포트 | 일별 수술 건수 (subtype 분해). **수술별 비중** 페이지 · 주차 레포트 소스. |
| `list_surgery` | TABLE | V2 | 수술 > 수술자 리스트 | 수술자 리스트 원본 행. **수술자 리스트 페이지** + `v_all_surgery_list` UNION base. |
| `list_reoperation` | TABLE | V36 | 수술 > 수술자 리스트 (재수술 검토 모달) · 마케팅 > 예약 퍼널 (reop 단계 EXISTS) | 재수술 후보 (RE_OPERATION 원본 + 자동판정 + 제외사유 + is_lens). **재수술 검토 모달** + `v_all_surgery_list` UNION base + 예약 퍼널 재수술 코호트 판정. |
| `v_all_surgery_list` | VIEW | V37 | — (배치 재집계 base · 화면 미경유) | `list_surgery` + `list_reoperation` + `reoperation_decision` UNION. 눈 단위로 펼치고 op_type 분류 부여. **`mart_surgery_daily` 배치 재집계의 유일 base**(`select-surgery-daily-agg.sql`). 수술자 리스트 화면은 `list_surgery` 를 직접 읽음(뷰 미경유). |

---

## 3. 예약 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_reservation_monthly` | TABLE | V3 | 예약 > 예약 건수 (메뉴 숨김·라우트 유지) | 월별 수술/외래/드림렌즈 예약 건수. `list_reservation_all` 을 월로 접어 만듦. **예약 건수 페이지**(메뉴 숨김, 라우트 유지). |
| `mart_reservation_overall_monthly` | TABLE | V12 | 예약 > 예약 종합 · 리포트 > 월간/주차 레포트 | 월별 예약 종합·콜·온라인. **예약 종합 페이지** · 월간/주차 레포트. 2024·2025는 골든시드(V12), 2026-06+는 채널 마트 SUM. |
| `list_reservation` | TABLE | V3 (+V39–V50 ALTER) | 예약 > 예약자 리스트 · (전환&성공률 > 예약률 EXISTS 후보) | RESERVE_FLAG='M' 검사 예약 명단 (풍부한 컬럼: name, channel, doctor, memo 등). **예약자 리스트 페이지** · 시력교정 예약률 후보 EXISTS 조회. |
| `list_reservation_all` | TABLE | V53 | — (배치·집계 전용, 화면 조회 없음) | 수술(O)/외래(JINRYO=2)/드림렌즈(D) 얇은 리스트. `mart_reservation_monthly` 재집계 원천. **배치·집계 전용** (화면 조회 없음). |
| `list_reservation_change` | TABLE | V63 (+2026-09-11 first_loaded_at 소급) | 예약 > 예약 변경이력 | 검사예약(M/D/H) 전부 — `change_count` ≥ 1 이 변경된 예약(변경 상세), 0 은 미변경(추이 달력의 등록 건수·변경률 분모). RESERVE_HISTORY 를 예약 단위 체인(변경시각@예약일)으로 접어 `reserve_num` upsert. 배치 범위 = **이력 저장 기간**(등록일 아님) — 늦은 변경도 D-1 배치가 흡수. 감사 컬럼 2종: `first_loaded_at`(최초 적재 · UPSERT 보존) · `loaded_at`(재적재마다 갱신). **정본 문서: [`docs/reservation/change-history.md`](../reservation/change-history.md)** (배치 범위·등록일 3순위·HISTORY_TIME 파싱·change_chain 규격·함정 8종·감사 컬럼 정책 §10-A). |
| `mart_list_reservation_homepage` | TABLE | V21 | 예약 > 예약자 리스트_홈페이지 · 예약 > 예약 종합 | 레거시 홈페이지 예약 raw (홈페이지 DB → 마트 이관본). **예약자 리스트_홈페이지 페이지** + 예약 종합의 홈페이지 몫. |
| `mart_reservation_stats_system_daily` | TABLE | V11 | 예약 > 예약통계_시력교정 · 예약 > 예약 종합 | 시력교정 채널 통계 (CH01~CH24 · 인콜·TM·네이버·카카오·홈페이지 등). **예약통계_시력교정 페이지** + 예약 종합 계산. 2026 H1 시드(V19). |
| `mart_reservation_stats_cataract_daily` | TABLE | V11 | 예약 > 예약통계_백내장 · 예약 > 예약 종합 | 백내장 채널 통계 (인콜·TM·카카오·온라인). **예약통계_백내장 페이지** + 예약 종합 계산. 2026 H1 시드(V20). |
| `reservation_stats_period_lock` | TABLE | V11 | — (배치 방어용) | 월 확정(잠금) 상태 — 배치 덮어쓰기 방어. V19·V20 seed 로 2026-01~06 잠금 등록. |
| `reservation_stats_override` | TABLE | V11 | 예약 > 예약통계_시력교정/백내장 (수기 보정 저장) | 예약통계 셀 수기 보정 이력 (INSERT-only 감사 로그). `ReservationStatsOverrideCellEditService`. |
| `reservation_channel_staff` | TABLE | V43 | — (`v_reservation_channel` LEFT JOIN base) | 예약 채널 스태프 매핑 (담당자 → 채널). `v_reservation_channel` LEFT JOIN base. |
| `v_reservation_channel` | VIEW | V43 (+V48/V50 확장) | 마케팅 > 예약 퍼널 · 마케팅 > 채널별 수익성 | `list_reservation` + `reservation_channel_staff` 파생. 채널 분류 + op_type + 결제금액 컬럼. **채널 퍼널·채널×op_type·채널별 렌즈원가**. |

---

## 4. 검사 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_examination_monthly` | TABLE | V4 | 검사 > 시술별 | 시술별 검사수 월별 (vision · dreamlens · cataract). **시술별 페이지**. |
| `mart_procedure_exam_monthly` | TABLE | V4 | 검사 > 검사건수 · 리포트 > 월간 레포트 | 검사수 월별 (전체 + 원데이). **검사건수 페이지** + 월간 레포트. |
| `list_exam` | TABLE | V4 (+V26 one_day) | 검사 > 검사자 리스트 · (전환&성공률 > 전환율 후보) | 시력교정 검사자 명단 (49필드). **검사자 리스트 페이지** + `v_all_exam_list` UNION base + 시력교정 상담성공률 후보. |
| `list_cataract_exam` | TABLE | V4 (+V23 classification, V32 one_day) | 검사 > 백내장 검사자 리스트 | 백내장 검사자 명단. **백내장 검사자 리스트 페이지** + `v_all_exam_list` UNION base. |
| `v_all_exam_list` | VIEW | V34 (+V52 확장) | 검사 > 전체 검사자 리스트 · 리포트 > 월간/주차 레포트 | `list_exam` + `list_cataract_exam` UNION + 파생 컬럼 (exam_group · cataract_class · exam_type · intro_type · job_bucket · stop_yn · stop_reason_bucket). **전체 검사자 리스트 페이지** + 월간/주차 레포트 검사 지표 원천. |

---

## 5. 상담·전환 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_consultation_rate_monthly` | TABLE | V5 | 전환&성공률 > 전환율 · 리포트 > 월간/주차 레포트 | 상담성공률 월별 (vision + cataract, wide 스키마 12+컬럼). **전환율 페이지** + 월간/주차 레포트. |
| `mart_reservation_rate_monthly` | TABLE | V5 | 전환&성공률 > 예약률 · 리포트 > 월간/주차 레포트 | 예약률 월별 (yr,mo,category='vision'/'cataract' long). **예약률 페이지** + 월간/주차 레포트. |
| `mart_stop_reason_monthly` | TABLE | V5 | 전환&성공률 > 중단 사유 · 리포트 > 월간/주차 레포트 | 중단 사유 7버킷 월별. **중단 사유 페이지** + 월간/주차 레포트. |

⚠️ **의미 겹치는 곳**: consultation_rate 와 reservation_rate 가 vision·cataract 별 `exam_count`·`surgery_booked` 를 양쪽 다 담음. 화면 컨슈머(전환율 vs 예약률)가 달라 통합하지 않고 유지.

---

## 6. 외래 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_outpatient_count_monthly` | TABLE | V6 | 외래 > 외래수 · 리포트 > 월간/주차 레포트 | 월별 외래수. **외래수 페이지** + 월간/주차 레포트. `list_outpatient` 를 월로 접어 만듦. |
| `list_outpatient` | TABLE | V25 | 외래 > 외래수 리스트 | 외래(F) + 내원/퇴원(I/H) 행. **외래수 리스트 페이지** + 외래수 일별 집계 원천. |

---

## 7. 종합지표 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_overall_exam_monthly` | TABLE | V10 | 검사 > 월별 검사자 종합지표 (관리자 전용) | 월별 검사자 종합지표 (30+지표, 유입·직업·수술 등). **월별 검사자 종합지표 페이지** (관리자 전용). |
| `mart_overall_exam_weekly` | TABLE | V7 | 검사 > 주간 검사자 종합지표 (관리자 전용) | 주간 검사자 종합지표 ("그 달의 주차" 기준). **주간 검사자 종합지표 페이지** (관리자 전용). |

⚠️ 주의: 여기서 말하는 "주간"은 `mart_weekly_report` 의 ISO 8601 주차와 다른 개념 (월 경계로 자른 "그 달의 n주차"). CLAUDE.md 참조.

---

## 8. 리포트 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_weekly_report` | TABLE | V28 (+V29·V38·V54 진화, V27·V30·V31·V38·V55 시드) | 리포트 > 주차 레포트 | 주차 레포트 원시 집계 30여 컬럼 (예약·유입·검사·수술·외래·드림렌즈 신규/FU 등). **주차 레포트 페이지** 유일 조회 소스. 2025 골든시드(V55) + 2026+ 배치. |
| `mart_exam_count_by_class` | TABLE | V28 | 리포트 > 월간 레포트 (고객분류별 도표) | 고객분류별 월별 검사수 (9계열 · 내원동기 대분류). **월간 레포트 고객분류별 도표**. 2026+ 배치 (24·25 없음). |

---

## 9. 기타 (매출·관리자 입력)

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_b2b_revenue_monthly` | TABLE | V8 | 기타 > B2B 매출 (메뉴 숨김·라우트 유지) | B2B 매출 월별. **B2B 매출 페이지** (기타 메뉴, 메뉴 숨김). |
| `ad_spend` | TABLE | V51 | 마케팅 > 채널별 수익성 (화면 입력) | 채널별 수익성 광고비 입력. **채널별 수익성 페이지** (관리자가 화면에서 입력). |
| `lens_cost` | TABLE | V51 | 마케팅 > 채널별 수익성 (화면 입력) | 채널별 수익성 렌즈 원가 입력. 상동. |

---

## 10. 해외마케팅 도메인 (2026-09-09 이관)

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `overseas_marketing_sheet` | TABLE | V64 | 해외마케팅 > 접수리스트 · 통계 | 해외 접수 원본 22컬럼 + 매칭 결과(customer_no·matched_by) + `crm_snapshot`(JSON 19필드). Google Sheet 1회성 이관분(`origin='sheet'`)과 화면 수기 입력(`origin='manual'`, seq 1,000,000+) 공존. **접수리스트·통계 페이지** + CRM 매칭 잡(`sync-crm`) 결과 저장소. |
| `overseas_reservation_stats` | TABLE | V65 (+V66 시드) | 해외마케팅 > 예약통계 | 예약통계 셀값(`date × group × metric`). 시드(~2026-08-23, `source='seed'`) + 수기 수정(`source='manual'`, 우선) + 조회 시 접수리스트 자동 집계(2026-08-24+) 3중 병합. **예약통계 페이지**. |

> 세부 컬럼·매칭 규칙·JSON 스키마: [`docs/marketing/mart-tables.md`](../marketing/mart-tables.md) · 매칭 로직: [`docs/marketing/overseas-crm-matching.md`](../marketing/overseas-crm-matching.md).

---

## 12. 회계 도메인 (2026-09-15 신설)

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `list_medical_receipt` | TABLE | V67a | 회계 > 진료 수납 · 진료 매출 그래프(구분 필터) | 의사랑(IPLUS) 외래(`PAOSUNAB_New`)·입원(`PAISUNAB_New`) 수납 원장 행 그대로. **2026-01-01~** (_New 체계). 자연키 없음 → 수납일 범위 delete+insert. |
| `mart_medical_receipt_monthly` | TABLE | V67b | 회계 > 진료 매출 그래프 | 의사랑 월집계 (건수·수납할금액·청구액·급여총액·비급여·미수회수/발생·환불금/발생·건생비 → 레거시 순액 `net`). **2023~**. 행이 없는 연도의 그래프와 연도 비교가 읽는다. |
| `list_vision_receipt` | TABLE | V67c | 회계 > 시력교정 매출 내역 · 매출 집계 · 매출 그래프 | SOFTCRM 비급여 수납 전표 상세(`CstPrcSub`+`PrcItmDtl`/`PrcItmLst`+`OPERATIONDATA`) 1줄 = 1행. 취소 전표는 결제취소 행(음수) 추가. 진료명 17종 `item_amounts`(JSONB)·과세/면세. **2023~**. 세 화면 모두 이 표를 조회 시 접는다. |

> 배치 도메인 `ACCOUNTING`(`AccountingMartJob`) · 범위 = **수납일** · 의사랑 구간은 링크드서버 `[220.85.109.240]` OPENQUERY(`sql/iplus/accounting/*-inner.sql`, `OpenQuerySql` 래퍼) 라 `MedicalReceiptImportService` 가 REQUIRES_NEW 로 격리 — 원격 장애 시 진료 수납만 건너뛴다(`list_medical_receipt_failed=1`).
> 정본: [`docs/accounting/mart-and-api.md`](../accounting/mart-and-api.md).

---

## 11. JPA 엔티티 (Hibernate `ddl-auto: update`)

| 이름 | 엔티티 | 사이드메뉴 | 용도 |
|---|---|---|---|
| `users` | `User` | — (로그인/인증) | 로그인·인증 (JWT). `AuthController` · `SecurityConfig`. |
| `dreamlens_ledger` | `DreamlensLedgerEntry` | 기타 > 드림렌즈 장부 | 드림렌즈 장부 (직접 입력 테이블). **드림렌즈 장부 페이지** CRUD · `DreamlensLedgerSeeder` 초기 시드. |
| `reoperation_decision` | `ReoperationDecision` | 수술 > 수술자 리스트 (재수술 검토 모달) | 재수술 포함/제외 담당자 확정 판정. **재수술 검토 모달** 저장 · `v_all_surgery_list` LEFT JOIN 오버레이. |

---

## 뷰 의존성 그래프

```
v_all_exam_list       ← list_exam + list_cataract_exam
v_all_surgery_list    ← list_surgery + list_reoperation + reoperation_decision (JPA)
v_reservation_channel ← list_reservation + reservation_channel_staff
```

- **Base 테이블 = 도메인 원천** (배치가 delete+insert 로 적재)
- **뷰 = 화면·집계용 파생 규칙 SSOT** — 규칙이 바뀌면 뷰 한 곳만 고침

---

## 외부 DB 원본 매핑

배치·집계가 외부 DB **3종**에서 데이터를 읽어와 마트를 조립한다. 화면 조회는 원칙적으로 마트만 사용하며, 외부 DB 는 배치 시점 또는 명시적 예외 페이지에서만 접근한다.

| # | 외부 DB | JdbcTemplate | 접근 시점 | 용도 |
|---|---|---|---|---|
| 1 | **MSSQL 운영 DB** | `statsJdbcTemplate` | 배치 시점만 (SSH 터널) | primary list 마트 적재 + 해피톡 일별 집계 + 회계 시력교정 매출(`CstPrcSub`·`PrcItmDtl`·`PrcItmLst`) |
| 1' | **의사랑 IPLUS** (MSSQL 링크드서버 `[220.85.109.240]`, 운영 DB 경유) | `statsJdbcTemplate` + `OpenQuerySql` | 배치 시점만 | 회계 진료 수납(`PAOSUNAB(_New)`·`PAISUNAB(_New)`·`PAYTRANS`·`NHICM4AP`·`RECEIPTCASH`) + 드림렌즈 장부 진료비 |
| 2 | **MariaDB 홈페이지** | `homepageJdbcTemplate` | 배치 시점만 | `mart_list_reservation_homepage` 이관 |
| 3 | **MSSQL 아이리더** | `eoeisJdbcTemplate` | 화면 조회 시 (예외) | 아이리더 검사통계 페이지 전용 |

### 1. MSSQL 운영 DB — 총 23개 테이블

primary list 배치가 각 마트를 만들 때 조인하는 원본. 이 list 마트들이 이후 모든 monthly/weekly/daily 집계 마트의 SSOT.

#### 1-A. primary list 배치 원천 (19개)

##### list 마트별 사용 원본

| list 마트 | 채우는 SQL | 사용 MSSQL 테이블 (주 → 보조 순) |
|---|---|---|
| `list_reservation` | `sql/softcrm/reservation/list/select-reservation-list.sql` | **RESERVATION** · EXAM · OPERATIONDATA · Cataract_Operationdata · EMPLOYEE · COSTPRICE · MOTIVE_NEW02 · DB_CUSTOM |
| `list_reservation_all` | `sql/softcrm/reservation/list/select-reservation-list-all.sql` | **RESERVATION** |
| `list_reservation_change` | `sql/softcrm/reservation/history/select-reservation-change-history.sql` | **RESERVE_HISTORY** · RESERVATION |
| `list_exam` | `sql/softcrm/exam/select-exam-list.sql` | **EXAM** · OPERATIONDATA · RESERVATION · Cataract_Exam · CUSTOM · EMPLOYEE · COSTPRICE · CSTPRCSUB · PRCITMLST · PrcItmDtl · MOTIVE_NEW01 · MOTIVE_NEW02 · CANCEL_CFG · MEDICAL_SUB_CFG · NationCustom_CFG · EtcCfg |
| `list_cataract_exam` | `sql/softcrm/exam/select-cataract-exam-list.sql` | **Cataract_Exam** · Cataract_Operationdata · RESERVATION · CUSTOM · EMPLOYEE · COSTPRICE · CSTPRCSUB · PRCITMLST · PrcItmDtl · MOTIVE_NEW01 · MOTIVE_NEW02 · CANCEL_CFG · MEDICAL_SUB_CFG · NationCustom_CFG · EtcCfg |
| `list_surgery` | `sql/softcrm/surgery/select-surgery-list.sql` | **OPERATIONDATA** · **Cataract_Operationdata** · EXAM · Cataract_Exam · RESERVATION · CUSTOM · EMPLOYEE · COSTPRICE · MOTIVE_NEW01 · MOTIVE_NEW02 · NationCustom_CFG · EtcCfg |
| `list_reoperation` | `sql/softcrm/surgery/select-reoperation-candidates.sql` | **RE_OPERATION** · CUSTOM · EMPLOYEE · COSTPRICE |
| `list_outpatient` | `sql/softcrm/outpatient/select-outpatient-list.sql` | **RESERVATION** · CUSTOM · EMPLOYEE · MOTIVE_NEW01 · MOTIVE_NEW02 · MEDICAL_SUB_CFG · NationCustom_CFG · EtcCfg |

##### 전수 목록 — 총 19개 (분류별)

| 분류 | 개수 | 테이블 |
|---|---|---|
| 트랜잭션 원장 | 6 | `RESERVATION`, `EXAM`, `Cataract_Exam`, `OPERATIONDATA`, `Cataract_Operationdata`, `RE_OPERATION` |
| 환자·직원 마스터 | 3 | `CUSTOM`, `EMPLOYEE`, `DB_CUSTOM` (텔레매니저 배정) |
| 결제·시술 항목 | 4 | `COSTPRICE`, `CSTPRCSUB`, `PRCITMLST`, `PrcItmDtl` |
| 코드 마스터 | 6 | `MOTIVE_NEW01`, `MOTIVE_NEW02`, `CANCEL_CFG`, `MEDICAL_SUB_CFG`, `NationCustom_CFG`, `EtcCfg` |

#### 1-B. 해피톡 집계 원천 (4개 · primary list 미포함)

예약통계(시력교정/백내장) daily-counts + 주차 레포트가 별도로 읽는다. 사용 SQL: `sql/softcrm/reservation/stats/select-*-daily-counts.sql`, `sql/softcrm/reservation/stats/select-*-drill-down.sql`.

| 테이블 | 역할 |
|---|---|
| `HappyTalk_Counsel_List` | 상담 원장 (주) |
| `HappyTalk_Mapping` | 상담 ↔ 고객 매핑 (LEFT JOIN) |
| `HappyTalk_Category01` | 카테고리1 (INNER JOIN) |
| `HappyTalk_Category02` | 카테고리2 (LEFT JOIN) |

### 2. MariaDB 홈페이지 (`homepageJdbcTemplate`) — 1개

| 테이블 | 소비 마트 | SQL |
|---|---|---|
| `TBL_COUNSEL` | `mart_list_reservation_homepage` | `sql/homepage/mariadb/*.sql` |

> ℹ️ `sql/homepage/sqlite/` 하위 미러는 로컬 개발용. 운영 소스는 MariaDB.

### 3. MSSQL 아이리더 (`eoeisJdbcTemplate`) — primary list 미사용

- 아이리더 검사통계 페이지(`/stats/eoeis-checkup`) 전용. **primary list 마트/배치와 무관**.
- 조회 SQL: `sql/eoeis/select-checkup-stats.sql` · `sql/eoeis/select-device-scores.sql` (2026-08-26 exam/ 에서 분리).
- `EOEIS_DATASOURCE_URL` 미설정 시 페이지 503 (마트가 없으므로 대체 조회 불가).

### 외부 테이블 총계

| 소스 | primary list 배치 | 별도 집계 | 합계 |
|---|---|---|---|
| MSSQL 운영 | 19 | 4 (해피톡) | 23 |
| MariaDB 홈페이지 | 1 | — | 1 |
| MSSQL 아이리더 | 0 | 1 (화면 직결) | 1 |
| **총 외부 테이블** | **20** | **5** | **25** |

> ℹ️ MSSQL 컬럼·PK·FK 는 [`docs/db/tables/`](tables/) 카탈로그 참조.

---

## 집계 마트 조립 경로 (list 기반 vs MSSQL 직결)

**"모든 지표가 primary list 기반"이라는 명제는 성립하지 않는다.** 배치 잡을 실측한 결과, 집계 마트는 아래 5가지 조립 경로 중 하나를 따른다. (2026-08-19 재분류: overall_exam·exam_count_by_class 는 list 이관 완료로 A 로 승격, 브릿지 3종은 하이브리드 B 로 분리.)

### A. list 기반 순수 마트 (Postgres 내에서 재집계) — 8개

배치 잡이 `martJdbcTemplate` 만 사용. MSSQL 은 접근하지 않는다. 정의가 바뀌면 list SQL 한 곳만 고치면 되므로 정합성 유지에 유리.

| 집계 마트 | 조립 SQL | 읽는 base |
|---|---|---|
| `mart_surgery_monthly` · `mart_surgery_daily` | `select-surgery-daily-agg.sql` | `v_all_surgery_list` (= list_surgery + list_reoperation + reoperation_decision) |
| `mart_examination_monthly` · `mart_procedure_exam_monthly` | `select-exam-daily-agg.sql` | `v_all_exam_list` (= list_exam + list_cataract_exam) |
| `mart_stop_reason_monthly` | `select-stop-reason-daily-agg.sql` | `v_all_exam_list` |
| `mart_outpatient_count_monthly` | `select-outpatient-daily-agg.sql` | `list_outpatient` |
| `mart_reservation_monthly` | `select-reservation-daily-agg.sql` | `list_reservation_all` |
| `mart_exam_count_by_class` | `select-exam-count-by-class-monthly-agg.sql` | `v_all_exam_list` (motive_report GROUP BY) |
| `mart_overall_exam_monthly` · `mart_overall_exam_weekly` | `select-overall-exam-daily-agg.sql` (일별 → 주/월 롤업) | `v_all_exam_list` (V56 확장: surgery_reserve_date · cataract_eye_count) |

### B. 하이브리드 (list 후보 + MSSQL 브릿지) — 3개

**의도적 설계 · list 완전 이관 예외.** 검사일 이후의 "미래 예약/수술" 실시간 판정이 지표 정확도에 결정적. list 로 후보를 뽑고 `ConsultationRateBridgeRepository` 가 chart_no 청크 IN 조회로 MSSQL 실시간 상태를 병합. 배치 시점 이후 발생한 O 예약도 즉시 반영됨(2026-07 vision -125건 사례가 이 브릿지가 없으면 재현).

| 마트 | list 후보 | MSSQL 브릿지 |
|---|---|---|
| `mart_consultation_rate_monthly` | `list_exam` · `v_all_exam_list` 후보 SQL | 미래 O 예약 존재 여부 실시간 조회 |
| `mart_reservation_rate_monthly` | `list_exam` · `list_reservation` · `v_all_exam_list` 후보 SQL | 상동 |
| `mart_weekly_report` (예약률 계열만) | `v_all_exam_list` 세션 리스트 | 상동 · 검사·수술·외래 지표는 A 처럼 list 기반 |

### C. MSSQL 직결 마트 (list 미경유) — 3개

배치 잡이 `statsJdbcTemplate` 로 MSSQL 을 직접 읽어 계산 후 Postgres 마트에 upsert. list 스키마로 담기 어려운 소스(CTI·네이버·해피톡)를 조합하거나 소급 변동·현재값 lookup 이 필요해 스냅샷으로 못 뽑는 마트.

| 마트 | 원천 (MSSQL) | 이유 |
|---|---|---|
| `mart_reservation_stats_system_daily` | HappyTalk_* + RESERVATION · **RESERVATION_NAVER** · **RESERVE_HISTORY** · **DB_ReCounsel** · **CtiRptLst** · **CtiClg** · **stat_user_inbound_bseye** · DB_CUSTOM · CUSTOM | CTI·네이버·재상담 등 7종+ 부가 소스 조합 필요 · 예약 InsertedDateTime 소급 갱신 |
| `mart_reservation_stats_cataract_daily` | 상동 (백내장 후보 포함) | 상동 |
| `mart_b2b_revenue_monthly` | OPERATIONDATA · Cataract_Operationdata · RESERVATION · CUSTOM · EMPLOYEE · COSTPRICE · PrcItmLst · **AssignList** · MOTIVE_NEW01/02 · MEDICAL_SUB_CFG | AssignList 스키마 미문서화 · 비용 소급 재계산에 CUSTOM 현재값 lookup 필요 (list 스냅샷으로 못 뽑음) |

> ⚠️ C 그룹의 원천 테이블 중 **RESERVATION_NAVER · RESERVE_HISTORY · DB_ReCounsel · CtiRptLst · CtiClg · stat_user_inbound_bseye · AssignList** 는 위 §외부 DB 원본 매핑의 primary list 19개에 미포함. 예약통계·B2B 마트가 별도로 읽는다.

### D. 간접 (마트 → 마트) — 1개

Postgres 마트끼리 SUM 해서 다른 마트를 만드는 케이스. list 를 직접 읽지 않지만, 소스 마트가 C 그룹이면 **간접적으로 MSSQL 의존**.

| 마트 | 소스 |
|---|---|
| `mart_reservation_overall_monthly` | `mart_reservation_stats_system_daily` + `mart_reservation_stats_cataract_daily` + `mart_list_reservation_homepage` SUM (컷오버 2026-06 이후) + V12/V24 골든시드(24·25·26H1). 화면 서비스(`ReservationOverallMartQueryService @Primary`) 와 동일 계산식 재사용. |

### E. 관리자 입력 · 시드 (외부 원천 없음)

| 대상 | 성격 |
|---|---|
| `ad_spend` · `lens_cost` | 화면(채널별 수익성)에서 직접 입력 |
| `dreamlens_ledger` (JPA) | 화면(드림렌즈 장부) CRUD |
| 24·25 골든 시드 (V12·V13·V14·V15·V18 등) | 담당자 확정값 · SQL 마이그레이션 직접 INSERT |

### 분류 요약

| 그룹 | 개수 | 특성 |
|---|---|---|
| A. list 기반 순수 | 8 | list 재집계로 정의 통일 완료 (수술·검사·외래·중단사유·예약 월별·검사수 by class·전체지표 주/월) |
| B. 하이브리드 (list + 브릿지) | 3 | consultation-rate·reservation-rate·weekly-report 예약률 — 미래 예약 실시간 판정 필수 |
| C. MSSQL 직결 | 3 | 예약통계 2종·b2b — 채널 판정 스키마 강결합/현재값 lookup 필요 |
| D. 마트→마트 (간접) | 1 | reservation_overall (C 그룹에 의존) |
| E. 관리자 입력·시드 | — | 외부 원천 없음 |

> ℹ️ **정합성 시사점**: A 그룹은 list SQL 한 곳만 고치면 전 하위 마트에 반영. B/C/D 그룹은 마트별 배치 잡을 각각 고쳐야 함(2026-08-05 원데이 3건 케이스가 그 예).
>
> ✅ **이관 결과 정리** (2026-08-19 종결): [`list-migration-plan.md`](list-migration-plan.md) 참조.
> 완료: `mart_exam_count_by_class` · `mart_overall_exam_monthly/weekly` (A 로 승격).
> 폐지: `mart_reservation_kakao_daily` (dead consumer 로 확인 · 소비자·적재·SQL·CREATE 문 정리, 배포 DB 는 수동 DROP).
> 의도적 예외: B(브릿지 3종) · C(예약통계 2종·B2B) — 실시간 정확도가 결정적이거나 이관 이득 없음.

---

## 배치 · 시드 요약

- **자동 배치**: `BatchOrchestrator.runDaily` (매일 03:00 D-1) + `runReservationStatsIntraday` (매일 10:00 D-1) + `runMonthlyReconcile` (매월 1일 03:30 전월).
- **min-year 가드**: `batch.mart.min-year=2026` — 24·25 시드 보호. 각 도메인 잡이 이 이하 write 차단.
- **골든 시드** (담당자 확정값 · 배치가 덮지 않는 구간):
  - `mart_overall_exam_monthly` — V14 (24·25) + V16 (26 cataract) + V27 (26-01~05)
  - `mart_reservation_overall_monthly` — V12 (24·25) + V24 (26-01~05)
  - `mart_consultation_rate_monthly` — V18 (24·25) + V27 (26-01~05)
  - `mart_reservation_rate_monthly` — V13 (24·25) + V27 (26-01~05)
  - `mart_surgery_monthly` — V15 (24·25) + V35 (26-01~05)
  - `mart_examination_monthly` — V22 (26-01~05 백내장 골든)
  - `mart_weekly_report` — V27·V30·V31·V38 (26-01~05·26 부분) + V55 (2025 전 구간)
  - `mart_reservation_stats_system_daily` — V19 (26 H1)
  - `mart_reservation_stats_cataract_daily` — V20 (26 H1)

---

## 데이터 흐름

```
[MSSQL 운영 DB]
    ↓ (배치 시점 SSH 터널)
    ↓
[Postgres 마트] ← 화면은 여기만 읽음
    ↓
[React 화면]
```

**화면 조회 시 MSSQL·홈페이지 DB 직접 접근 없음.** (2026-08 감사 확인)
예외:
- 관리자 진단(`diagnostics/*`) 엔드포인트 — mart vs MSSQL 비교 목적
- 아이리더 검사통계 페이지 — 별도 `eoeisJdbcTemplate` 소스

> 🔎 **화면-마트 결합의 스프링 구조** — 컨트롤러는 `XxxReader` 인터페이스에 의존하고, `postgres-mart` 프로파일 하에서는 `XxxMartQueryService(@Primary)` 가 자동 선택돼 Postgres 마트를 조회한다. legacy `XxxStatsService`(= `@Qualifier("statsJdbcTemplate")` 리포지토리를 감싸는 MSSQL 직결 구현)는 컨텍스트에 남지만 **화면 응답에 관여하지 않는다** — 그 존재 이유는 (a) 배치 잡이 마트 적재용 소스로 주입, (b) 관리자 대사(reconcile)/진단, (c) 비-마트 프로파일(H2 local) 폴백 세 가지. 즉 `statsJdbcTemplate` 리포지토리가 24개 있어도 화면 트래픽은 마트로만 간다.

---

## 참고 문서

- `CLAUDE.md` — 프로젝트 표준·통계 페이지 목록
- `docs/databatch/strategy.md` — 배치 재적재 전략
- `docs/db/tables/` — MSSQL 원본 테이블 카탈로그
- `docs/db/지표정의.md` — 지표별 정의·계산 규칙
- `docs/db/중단사유-분류-정의.md` — 중단사유 7버킷 매핑
- [`docs/db/list-migration-plan.md`](list-migration-plan.md) — B그룹(MSSQL 직결) 마트의 list 기반 이관 로드맵
