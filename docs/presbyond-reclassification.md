# PRESBYOND SMS 발송 재분류 (국지 규칙)

- 상태: **적용**(코드 반영 완료, 2026-09-08)
- 결정: 2026-09-08
- 담당: subin.han
- 스코프: **SMS 발송 판정에만** 국한된 국지 규칙. 통계·리스트·비중·마트 컬럼 등 다른 곳은 전혀 손대지 않았다.

## 1. 왜 바꿨는가

기존에는 `PRESBYOND` op_type 이 어느 SMS 그룹에도 매핑되지 않아 자동으로 `ETC(기타)` 로 떨어졌고, 결과적으로 첫 접촉 안내 문자가 나가지 않았다. 현장에서는 PRESBYOND 도 라섹/라식의 한 변형(`+LE` 유무로 구분) 이라 첫 접촉 SMS 는 해당 그룹으로 나가는 게 맞다.

수술 통계 화면(수술 건수·수술별 비중·월간/주차 레포트·채널별 예약) 에서는 PRESBYOND 를 **독립 op_type 으로 계속 노출**한다 — 화면 카운트 정의를 흔들지 않고 SMS 커버리지만 확장하는 것이 이번 결정의 요점이다.

## 2. 대안 정리 (2026-09-08)

세 갈래를 검토하고 **(c)** 로 결론.

- **(a) 전면 재분류** — V47 함수·V37 뷰·MSSQL CASE 4곳을 전부 바꾸고 `presbyond` op_type 을 폐지. 마트 컬럼도 DROP. 통계 화면 UI 변경 필요.
- **(b) op_name 기반 파생 지표로 유지** — 라섹/라식이 PRESBYOND 를 흡수하고, 별도 PRESBYOND 컬럼은 부분집합 지표로 보여줌. 합계 = visionPatients 등식이 깨져 각주 필요.
- **(c) SMS 발송 판정에만 국지 재분류 · 다른 화면·통계는 유지** ← **채택**
  - 장점: 화면·마트·집계 정의 흔들지 않고 SMS 커버리지 확장. 롤백 쉬움.
  - 단점: op_type 정의가 SMS 안팎에서 서로 다름 (정의 분열). 새 개발자가 헷갈릴 수 있음.

## 3. 재분류 규칙 (SMS 조회에서만)

| op_name (예시) | 통계 op_type (변화 없음) | SMS 조회 opType |
|---|---|---|
| `PRESBYOND+LE`, `MONO+PRESBYOND+LE`, `PRESBYOND+LE+X` 등 | `presbyond` | `lasek` |
| `PRESBYOND`, `PRESBYOND+X`, `MONO+PRESBYOND`, `MONO+PRESBYOND+X` 등 | `presbyond` | `lasik` |

판정 로직:
```
op_name ILIKE '%PRESBYOND%' AND (surgery_r ILIKE '%+LE%' OR surgery_l ILIKE '%+LE%') → 'lasek'
op_name ILIKE '%PRESBYOND%'                                                          → 'lasik'
```

- `+LE` 는 `%+LE%` 리터럴 매칭 (`+` 는 와일드카드 아님)
- `M-LE`(기존 lasek 패턴) 과 혼동 없음 (`-LE` vs `+LE`)
- 우안·좌안 어느 쪽이든 `+LE` 가 있으면 lasek 판정 (양안 다른 시술 조합 대비)

## 4. 변경 파일 (3곳)

### 4.1 SMS 조회 SQL 2개 (핵심)

| 파일 | 조치 |
|---|---|
| `backend/src/main/resources/sql/sms/select-surgery-targets.sql` | opType 컬럼을 CASE 로 감싸 재분류. WHERE IN 필터에 `OR surgery_* ILIKE '%PRESBYOND%'` 추가. 파일 머리 주석 갱신. |
| `backend/src/main/resources/sql/sms/select-surgery-by-chart.sql` | opType 컬럼만 동일 규칙으로 CASE 로 감쌈. |

### 4.2 자바 주석 정리 (선택)

| 파일 | 조치 |
|---|---|
| `backend/src/main/java/com/bviit/analytics/sms/config/SurgeryGroup.java:48` | ETC 그룹 javadoc 에서 "프레스비욘드" 삭제, PRESBYOND 가 SMS SQL 재분류로 여기 안 온다고 명시. |

## 5. 손대지 않은 것들 (§2 As-Is 그대로 유지)

- `V47__surgery_op_type_fn.sql` — 함수는 `presbyond` op_type 을 계속 반환
- `V37__v_all_surgery_list.sql` — 뷰 CASE 도 `presbyond` 그대로
- `select-vision-monthly/daily-by-type.sql` (MSSQL) — 두 CASE 모두 `presbyond` 그대로
- `mart_surgery_monthly/daily.presbyond` 컬럼 — 존재·적재·조회 모두 그대로
- upsert/select-surgery-monthly/daily.sql — presbyond 필드 그대로
- `SurgeryDailyItem`·`SurgeryMonthlyItem`·`SurgeryStatsMartRepository`·`SurgeryStatsService`·`SurgeryAggFolder`·`SurgeryMartWriter` — 자바 필드 그대로
- 프론트 API 스키마·훅·타입·`surgeryCompositionUtils`(노란 컬럼)·`SurgeryCompositionPage` 헤더·`surgeryListUtils`(FILTERS/VisionType/classifyVision/VISION_BY_LABEL)·`ReservationChannelPage` 시리즈·`MonthlyReportCharts` VISION_COLS·`smsTableModel` 라벨 — 모두 그대로
- V35 골든 시드 2026-05 `presbyond=4` — 그대로 (재배분 없음)

## 6. 검증

- [x] `sql/sms/select-surgery-targets.sql` 편집 — CASE + IN OR 추가
- [x] `sql/sms/select-surgery-by-chart.sql` 편집 — CASE 추가
- [x] `SurgeryGroup.java` javadoc 갱신
- [ ] `./gradlew test` — `SmsDomainRulesTest` 포함 그린
- [ ] dev 부팅 후 자동 등록 실행 → 2026-05 PRESBYOND 4명이 발송 대상(LASIK 그룹)에 잡히는지 확인
- [ ] 화면(수술 건수·수술별 비중·리스트·월간 레포트) presbyond 카운트가 종전과 동일한지 확인 (변화 없음이 정상)

## 7. 롤백

두 SQL 파일의 CASE·OR 만 되돌리면 끝. 마트·화면 상태는 애초에 안 바꿔서 데이터 손실 없음.

```
git checkout -- backend/src/main/resources/sql/sms/select-surgery-targets.sql
git checkout -- backend/src/main/resources/sql/sms/select-surgery-by-chart.sql
git checkout -- backend/src/main/java/com/bviit/analytics/sms/config/SurgeryGroup.java
```

## 8. 알려진 정의 분열 리스크

- SMS 조회의 opType (`lasek`/`lasik` 재분류 후) ≠ 마트·통계의 op_type (`presbyond`)
- 새 개발자가 "왜 SMS 자동 등록된 LASIK 인원과 통계 라식 인원이 다를까?" 를 물을 수 있다 → 이 문서와 `select-surgery-targets.sql` 머리 주석이 답.
- 나중에 통계 쪽도 같은 정의로 흡수하고 싶으면 **§2 (a)** 로 확장하는 별도 작업이 필요.

## 9. "노안" 이라는 이름이 다른 도메인에도 있다 (혼동 주의)

이번 변경은 **수술 op_type 하나만** 건드리지 않은 채(그대로 두고), 오직 SMS 조회 시점에만 값을 다르게 매핑한다. "노안 관련 항목을 통계에서 없앤 게 아니냐"는 오해를 막기 위해 정리해 둔다.

| 도메인 | "노안" 표현 | 이번 변경 영향 |
|---|---|---|
| **수술 op_type** | `PRESBYOND` (유일) | ❌ 그대로 유지, **SMS 조회에서만** 라섹/라식으로 재매핑 |
| 백내장 예약통계 | `total_presbyopia`, `kakao_presbyopia_reservation`, `카톡_노안`, `R.RESERVE_JINRYO='16' → '노안외래'` | ❌ 무관 |
| 백내장 검사 분류 | `노안/FU` 라벨 (`B.MY_COUNSELOR='BS0808'`), 진료구분 `C_노안원데이(9)` | ❌ 무관 |
| 홈페이지 상담 유입 | `EXAM_TYPE=21` (노안) | ❌ 무관 |
| B2B 매출 수가 | `mart_etc_b2b_revenue_monthly.presbyopia_cost` | ❌ 무관 |
| 진료실 · 진료구분 코드 | `노안5진료실` (`RESERVE_SEQ=3`), `C_노안레이저` | ❌ 무관 |
