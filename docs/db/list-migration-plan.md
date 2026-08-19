# 집계 마트 list 기반 이관 — 결과 정리

작성일: 2026-08-19 (종결)
전제: [`mart-inventory.md`](mart-inventory.md) §집계 마트 조립 경로

## 아키텍처 원칙 확정

배치는 2단계로 나뉜다:
- **Phase 1** (MSSQL 접근 허용): primary list (list_*) 를 채운다
- **Phase 2** (MSSQL 접근 금지): 파생 마트는 오직 list 만 읽어 계산

**단, "실시간 판정이 정확도에 결정적인 마트" 는 의도적 MSSQL 예외로 유지** (브릿지 · 예약통계 · B2B).

## 검토 범위

이 문서는 위 원칙 하에 각 마트별로 이관 가능성을 판정하고 실제 이관 작업의 결과를 기록한다.

**사용 가능 자원**: `list_reservation`, `list_reservation_all`, `list_exam`, `list_cataract_exam`, `list_surgery`, `list_reoperation`, `list_outpatient`, `mart_list_reservation_homepage`, 파생 뷰 `v_all_exam_list` (V56 확장) · `v_all_surgery_list` · `v_reservation_channel`.

---

## 이미 완료된 이관 (git 히스토리 기준)

**주요 이관 커밋** — 대부분의 도메인은 이미 primary list 기반으로 전환됨.

| 커밋 | 이관 내용 |
|---|---|
| `5839508` | 전체 검사자 파생 로직을 뷰(`v_all_exam_list`, V34)로 승격 — 검사구분·원데이·유입·직업·백내장분류 파생 CASE 통합 |
| `40fbb84` | 월별·주차 레포트 **검사 지표**를 `v_all_exam_list` 기반으로 이관 |
| `468669e` | 수술 지표(월별·주차)를 `v_all_surgery_list`(V37) 기반으로 이관 — 시력교정/백내장/재수술 통합 |
| `ab9d0b4` | 배치 재구조 — **예약 monthly·외래수·중단사유** 를 list 재집계로 통일. 예약률·상담성공률은 list 후보 + MSSQL 브릿지 하이브리드 |
| `ab326d6` | 주차 레포트 **외래수·중단수**를 primary list 기반 집계로 이관 |
| `b755c55` | 주차 레포트 **예약률 계열**(시력교정 3종 + 백내장)을 세션 리스트(`v_all_exam_list`) + MSSQL 브릿지 하이브리드로 이관 |
| `f38f5b9` | 주차 레포트 **예약 종합(콜·온라인)**을 `mart_reservation_stats_*_daily` 채널 마트 기반으로 이관 + 2025 골든시드(V55) |
| `14466a8` | 재수술 후보 화면 조회를 `list_reoperation` 마트 기반으로 이관 — 화면 MSSQL 왕복 완전 제거 |

**현재 A그룹(순수 list 기반 재집계)** 마트 (이관 완료):
- `mart_surgery_monthly` · `mart_surgery_daily` ← `v_all_surgery_list`
- `mart_examination_monthly` · `mart_procedure_exam_monthly` ← `v_all_exam_list`
- `mart_stop_reason_monthly` ← `v_all_exam_list`
- `mart_outpatient_count_monthly` ← `list_outpatient`
- `mart_reservation_monthly` ← `list_reservation_all`

**하이브리드 (list 후보 + MSSQL 브릿지)** — **의도적 설계 · list 이관 예외**. 검사일 이후의 "미래 예약/수술" 실시간 판정이 지표 정확도상 필수라 `ConsultationRateBridgeRepository` 를 통해 MSSQL 실시간 조회:
- `mart_consultation_rate_monthly` — list 후보 + `ConsultationRateBridgeRepository` (chart_no IN 청크)
- `mart_reservation_rate_monthly` — 상동
- `mart_weekly_report` 의 예약률 계열 — `v_all_exam_list` 세션 + MSSQL 브릿지

> ⚠️ **이 3개 마트는 list 완전 이관 대상에서 제외**. 브릿지 자체가 "list 스냅샷의 미래 예약 gap 을 실시간으로 보정"하기 위한 의도적 하이브리드 구조. `ExamMartJob` 재적재 범위를 넓혀도 D 당일 예약을 놓치는 잔여 gap 이 있어 브릿지가 정확도 우위를 유지.

---

## 남은 MSSQL 직결 마트 판정 (기존 list 만으로 가능한가?)

### ✅ 완전 가능 — 2개 마트

기존 list 컬럼만으로 모든 지표가 커버되는 마트. 신규 list 없이 배치 잡만 재작성하면 완전 이관 가능.

#### 1. `mart_exam_count_by_class`

- **필요**: `v_all_exam_list.motive_report` (9계열 CASE) 를 `(yr, mo)` 로 GROUP BY
- **뷰 상태**: `motive_report` CASE 이미 존재 (내원동기 대분류 9계열)
- **작업**: `select-exam-count-by-class-monthly.sql` 을 `v_all_exam_list` 기반으로 재작성 + 배치 잡을 `martJdbcTemplate` 로 스위치
- **공수**: 0.5일

#### 2. `mart_overall_exam_monthly` · `mart_overall_exam_weekly` (16지표)

16개 컬럼 전부 기존 list/뷰로 매핑됨:

| 컬럼 | 기존 list 소스 |
|---|---|
| total_exam · vision_exam · cataract_total · cataract_only · dreamlens · one_day · stop_count | `v_all_exam_list` (exam_group · exam_type · stop_yn 파생 컬럼) |
| intro_general · intro_customer · intro_staff | `v_all_exam_list.intro_type` |
| job_office · job_student · job_etc | `v_all_exam_list.job_bucket` |
| **vision_booked · cataract_booked · one_day_booked** | `list_exam.surgery_reserve_date` · `list_cataract_exam.surgery_reserve_date` (배치 ingest 시점 O 예약 존재 여부가 컬럼에 담김) |

**중요 단서** — booked 3개 지표는 배치 스냅샷 gap 존재:
- `surgery_reserve_date` 는 list_exam 재적재 시점의 MSSQL 상태를 반영
- 재적재 이후 새로 생긴 O 예약은 다음 재적재 때 반영됨
- 현재 하이브리드 브릿지가 이 gap 을 실시간 메꾸는 이유 (2026-07 vision -125건 사례)

**gap 감수 옵션**:
- **옵션 A**: list_exam 재적재 범위·주기 확대 (예: 매일 최근 3개월 전체 재적재) → 완전 list 기반
- **옵션 B**: gap 감수 (지연 반영 허용 · 월말 소급 재계산 시 정확)
- **옵션 C**: overall_exam 도 하이브리드 브릿지 사용 (검사/예약률과 동일 패턴)

**공수**: 2~3일 (옵션 결정 + 배치 잡 재작성 + 대사 검증)

---

### 🟡 부분 가능 — 1개 마트

#### 3. `mart_b2b_revenue_monthly`

원천 MSSQL 11종 중 대부분이 이미 기존 list 에 이관됨:

| B2B 원천 | 기존 list 매핑 |
|---|---|
| OPERATIONDATA · Cataract_Operationdata | ✅ `list_surgery` |
| Cataract_Exam | ✅ `list_cataract_exam` |
| RESERVATION | ✅ `list_reservation` / `list_reservation_all` |
| CUSTOM · EMPLOYEE · MOTIVE_NEW01/02 · MEDICAL_SUB_CFG | ✅ 여러 list 에 포함 |
| COSTPRICE · PrcItmLst | 🟡 `list_exam.surgery_payment` 등 일부만 (7개 수가 항목별 세부 없음) |
| **AssignList** (B2B 배정 마스터) | ❌ 어느 list 에도 없음 |

**추가 gap**: 비용 소급 계산 로직 (`b2b-latest-cost-subquery.sql` · `b2b-accumulated-cost-subquery.sql`) 은 CUSTOM 현재값 lookup 이 필요 — list 에 이 스냅샷 없음.

**판정**: 원천 90% 있으나 AssignList + 비용 소급이 gap. B2B 정책·정확도 요구 수준에 따라 결정 필요.

---

### ❌ 기존 list 만으로 불가 — 3개 마트

원천 데이터가 어느 기존 list 에도 이관되어 있지 않아, 신규 primary list 없이는 근본적으로 계산 불가.

#### 4. `mart_reservation_kakao_daily` — **폐지 완료 (2026-08-19)**

- **원래 용도**: 예약자 리스트 화면의 `kakaoCount` 참고 표시.
- **실제 상태 확인**: 프론트가 hook 반환값을 destructure 하지 않아 **UI 렌더링이 존재하지 않음** (dead consumer).
- **다른 소비처 여부**: 없음 — 레포트·다른 집계 마트는 이 마트를 참조하지 않고 필요 시 HappyTalk 를 각자 직결.
- **처리**: 소비자(API·hook·zod schema)·적재 배치·`replaceKakaoDaily`·`reconcileKakao` endpoint·SQL 리소스 5종·V3 의 CREATE 문까지 함께 제거. 배포된 DB 는 수동 DROP.
- **결론**: 이관이 아니라 **폐지가 자연스러운 결정** — 소비자가 없어 이관 이득 자체가 없었음.

#### 5. `mart_reservation_stats_system_daily` (CH01~CH24)

채널별 원천 24개 커버 현황:

| 채널 그룹 | 원천 MSSQL | 기존 list |
|---|---|---|
| CH01·02 (인콜 인입/응대) | `stat_user_inbound_bseye` (CTI 실시간) | ❌ 없음 |
| CH03·04 (검사 신규예약문의/예약) | `CtiRptLst` + `CtiClg` | ❌ 없음 |
| CH05~10 (TM 전체DB/유효DB/예약/재상담) | `DB_CUSTOM` + `DB_ReCounsel` | 🟡 `list_reservation` 에 텔레매니저 배정 일부만 (조회용, 통계용 아님) |
| CH11·12·20 (홈페이지 접수/예약/취소) | `RESERVE_HISTORY` (MSSQL) | ❌ 없음 — `mart_list_reservation_homepage` 는 사내 홈페이지 MariaDB, MSSQL RESERVE_HISTORY 와 다른 소스 |
| CH13~16 (네이버 접수/거절/유효/예약) | `RESERVATION_NAVER` | ❌ 없음 |
| CH17·18·21 (카카오 문의/예약/취소) | HappyTalk_* | ❌ 없음 |
| CH19·22·23·24 (콜/네이버 취소·내원·부도·전체취소) | `RESERVATION` | 🟡 `list_reservation` 이 검사예약만 담아 부분 커버 |

- **24채널 중 21채널이 원천 부재**
- **판정**: 기존 list 로 3~4채널 부분 계산 가능, 완전 이관 불가.

#### 6. `mart_reservation_stats_cataract_daily`

- 상동. 백내장 특화 채널 판정 원천(new_exam_inquiry · new_re_inquiry 등)도 부재.
- **판정**: 기존 list 로 불가.

---

## 남은 마트 판정 요약

**설계 원칙** (2026-08-19 확정): 배치는 2단계로 나뉜다.
- **Phase 1** — primary list (list_*) 를 MSSQL 직결로 채운다 (허용)
- **Phase 2** — 파생 마트는 오직 list 만 읽어 계산 (MSSQL 접근 금지)

**단, 브릿지(`ConsultationRateBridgeRepository`) 를 통한 미래 예약 실시간 조회는 의도적 예외로 유지.**

| 마트 | 원천 커버 | 판정 | 필요 조치 | 공수 | 상태 |
|---|---|---|---|---|---|
| `mart_exam_count_by_class` | ✅ 완전 | 즉시 가능 | 배치 쿼리 재작성 (`v_all_exam_list` GROUP BY) | 0.5일 | ✅ **완료 2026-08-19** |
| `mart_overall_exam_monthly` | ✅ 완전 (booked 3종은 list_exam.surgery_reserve_date) | 즉시 가능 | MSSQL 6종 SQL → Postgres 재작성 | 2일 | ✅ **완료 2026-08-19** |
| `mart_overall_exam_weekly` | ✅ 완전 (상동) | 즉시 가능 | monthly 와 동일 소스 (Java 주 버킷팅 유지) | 위 공수에 포함 | ✅ **완료 2026-08-19** |
| `mart_consultation_rate_monthly` | 브릿지 예외 | **이관 안 함** | 브릿지 = 의도적 설계 · 정확도 우위 유지 | — | 예외 |
| `mart_reservation_rate_monthly` | 상동 | **이관 안 함** | 상동 | — | 예외 |
| `mart_weekly_report` 예약률 4종 | 상동 | **이관 안 함** | 상동 | — | 예외 |
| `mart_reservation_kakao_daily` | 소비자 dead 확인 | **폐지 완료** | UI 렌더링 없음 · 다른 소비처도 없음 · 소비자·적재·SQL·CREATE 문·배포 DB 수동 DROP | — | 폐지 |
| `mart_b2b_revenue_monthly` | MSSQL 필수 예외 | **이관 안 함** | 비용 소급 재계산 필요 · AssignList 스키마 미문서화 | — | 예외 |
| `mart_reservation_stats_system_daily` | MSSQL 필수 예외 | **이관 안 함** | 채널 판정 로직이 CTI 코드체계에 강결합 · OPENQUERY(EICN_MySQL) · 예약 InsertedDateTime 소급 갱신 · 브릿지와 동일 논리 | — | 예외 |
| `mart_reservation_stats_cataract_daily` | 상동 | **이관 안 함** | 상동 | — | 예외 |

---

## 결론 (2026-08-19 종결)

**이관 완료 마트 (배치가 MSSQL 미접근 · list 재집계)**:
- `mart_exam_count_by_class`
- `mart_overall_exam_monthly` · `mart_overall_exam_weekly`

**폐지 완료 마트**:
- `mart_reservation_kakao_daily` — 프론트 렌더링 없어 dead consumer 로 확인. 소비자·적재·SQL·CREATE 문 제거, 배포 DB 수동 DROP.

**의도적 MSSQL 예외 (list 이관 부적합 · 유지)**:
- 브릿지 3종 (consultation-rate · reservation-rate · weekly-report 예약률) — 미래 예약 실시간 판정 필수
- `mart_reservation_stats_system_daily` / `_cataract_daily` — 채널 판정 로직이 CTI 코드체계에 강결합 · OPENQUERY(EICN_MySQL) · 예약 InsertedDateTime 소급 갱신
- `mart_b2b_revenue_monthly` — 비용 소급 재계산 필요 · AssignList 스키마 미문서화

**아키텍처 원칙 확정**: primary list 로 이관 가능한 파생 마트는 완전 list 화 · 실시간성이 정확도에 결정적인 마트는 의도적 MSSQL 예외로 유지.

## 완료 기준 (Definition of Done)

- [x] `mart_exam_count_by_class` 이관 완료 (2026-08-19)
- [x] `mart_overall_exam_monthly/weekly` 이관 완료 (2026-08-19) · V56 로 v_all_exam_list 에 surgery_reserve_date · cataract_eye_count 추가 · OverallExamListAggregator 신설
- [x] 예약통계 시력교정/백내장 · B2B: 의도적 MSSQL 예외로 확정 (2026-08-19)
- [x] `mart_reservation_kakao_daily` 폐지 완료 (2026-08-19) — 프론트 렌더링 없어 dead consumer 로 확정. 소비자(API·hook·zod schema·reconcile endpoint)·적재 배치·SQL 리소스 5종·V3 CREATE 문 제거. 배포된 DB 는 수동 DROP.
- [x] `mart-inventory.md` §집계 마트 조립 경로 갱신 (2026-08-19) — 4그룹 → 5그룹 재분류. A: 8개(exam_count_by_class · overall_exam_monthly/weekly 승격) · B: 하이브리드 3개 신설(consultation-rate·reservation-rate·weekly-report 예약률) · C: MSSQL 직결 3개(예약통계 2·b2b) · D: 간접 1 · E: 시드/입력.
