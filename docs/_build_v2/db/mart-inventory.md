# Postgres 마트 인벤토리

작성일: 2026-08-13  
프로파일: `postgres-mart` (운영 표준)  
JDBC: `martJdbcTemplate` (Postgres) — 화면 조회는 여기만 사용

이 문서는 `backend/src/main/resources/sql/mart/V*.sql` 마이그레이션이 만드는 모든 테이블·뷰와 JPA 엔티티가 만드는 테이블을 도메인별로 정리한다. 각 항목의 **용도** · **원천/적재 경로** · **주요 컨슈머** 를 한눈에.

---

## 총계

| 종류 | 개수 |
|---|---|
| 마트 테이블 (`mart_*`, `list_*`, 기타 관리 테이블) | 33 |
| 마트 뷰 (`v_*`) | 3 |
| JPA 테이블 | 3 |
| **합계** | **39** |

---

## 1. 공용 배치 인프라

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `batch_run_log` | TABLE | V1 | 관리자 > 데이터 배치 관리 · (전 페이지 헤더의 배치 성공 시각) | 배치 실행 이력 (run_type · status · table_stats). `/admin/batch` 페이지 및 화면의 `useBatchLastSuccess` 훅 소스. |
| `batch_watermark` | TABLE | V1 | — (배치 내부용) | 각 도메인 잡의 최종 성공 시점 저장. 재실행 시점 관리. |

---

## 2. 수술 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_surgery_monthly` | TABLE | V2 | 수술 > 수술 건수 · 리포트 > 월간 레포트 | 시력교정·백내장·전체 월별 수술 건수. **수술 건수 페이지** 및 월간 레포트 소스. |
| `mart_surgery_daily` | TABLE | V2 | 수술 > 수술별 비중 · 리포트 > 주차 레포트 | 일별 수술 건수 (subtype 분해). **수술별 비중** 페이지 · 주차 레포트 소스. |
| `list_surgery` | TABLE | V2 | 수술 > 수술자 리스트 | 수술자 리스트 원본 행. **수술자 리스트 페이지** + `v_all_surgery_list` UNION base. |
| `list_reoperation` | TABLE | V36 | 수술 > 수술자 리스트 (재수술 검토 모달) · 마케팅 > 예약 퍼널 (reop 단계 EXISTS) | 재수술 후보 (RE_OPERATION 원본 + 자동판정 + 제외사유 + is_lens). **재수술 검토 모달** + `v_all_surgery_list` UNION base + 예약 퍼널 재수술 코호트 판정. |
| `v_all_surgery_list` | VIEW | V37 | 수술 > 수술자 리스트 · 리포트 > 월간/주차 레포트 | `list_surgery` + `list_reoperation` + `reoperation_decision` UNION. 눈 단위로 펼치고 op_type 분류 부여. **전체 수술 리스트·주차 레포트·수술 상세표** 소스. |

---

## 3. 예약 도메인

| 이름 | 종류 | V | 사이드메뉴 | 용도 |
|---|---|---|---|---|
| `mart_reservation_monthly` | TABLE | V3 | 예약 > 예약 건수 (메뉴 숨김·라우트 유지) | 월별 수술/외래/드림렌즈 예약 건수. `list_reservation_all` 을 월로 접어 만듦. **예약 건수 페이지**(메뉴 숨김, 라우트 유지). |
| `mart_reservation_overall_monthly` | TABLE | V12 | 예약 > 예약 종합 · 리포트 > 월간/주차 레포트 | 월별 예약 종합·콜·온라인. **예약 종합 페이지** · 월간/주차 레포트. 2024·2025는 골든시드(V12), 2026-06+는 채널 마트 SUM. |
| `mart_reservation_kakao_daily` | TABLE | V3 | 예약 > 예약자 리스트 (kakaoCount 참고) | 카카오(해피톡) 일별 건수 — 예약자 리스트 화면의 kakaoCount 참고 표시. |
| `list_reservation` | TABLE | V3 (+V39–V50 ALTER) | 예약 > 예약자 리스트 · (전환&성공률 > 예약률 EXISTS 후보) | RESERVE_FLAG='M' 검사 예약 명단 (풍부한 컬럼: name, channel, doctor, memo 등). **예약자 리스트 페이지** · 시력교정 예약률 후보 EXISTS 조회. |
| `list_reservation_all` | TABLE | V53 | — (배치·집계 전용, 화면 조회 없음) | 수술(O)/외래(JINRYO=2)/드림렌즈(D) 얇은 리스트. `mart_reservation_monthly` 재집계 원천. **배치·집계 전용** (화면 조회 없음). |
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

## 10. JPA 엔티티 (Hibernate `ddl-auto: update`)

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

---

## 참고 문서

- `CLAUDE.md` — 프로젝트 표준·통계 페이지 목록
- `docs/databatch/strategy.md` — 배치 재적재 전략
- `docs/db/tables/` — MSSQL 원본 테이블 카탈로그
- `docs/db/지표정의.md` — 지표별 정의·계산 규칙
- `docs/db/중단사유-분류-정의.md` — 중단사유 7버킷 매핑
