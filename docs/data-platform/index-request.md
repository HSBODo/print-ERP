# 데이터 플랫폼 raw 스키마 인덱스 요청

> 작성일: 2026-09-30 · 최신화: 2026-10-07·08 (여러 차례) · **2026-10-08 (raw-columns.txt + 테이블 크기 실측 재최적화 — EICN·Homepage 리딩 간소화 + 미요청 6개 추가 + 극소형 테이블 8개 PK 요청으로 전환 → 성능 인덱스 39 + PK 요청 8)**
> 요청자: 대시보드 팀
> 요청 대상: 데이터 플랫폼 팀 (`bnviit_datawarehouse` · `raw` 스키마 소유)
> 정본: [`docs/data-platform/migration-strategy.md` §10.1](./migration-strategy.md#101-인덱스-요청-성능)

## 0. 요약 (전체 **39개 성능 인덱스** · 복사용)

> 복사용 요약표는 standalone 파일 참조: [`raw인덱스 요청.md`](./raw인덱스%20요청.md) · [`index-request-summary.md`](./index-request-summary.md)
> ⚠️ 8개 극소형 테이블(cancel_cfg·nationcustom_cfg·etccfg·lens_cfg·setkind·happytalk_category01/02·medical_sub_cfg)은 성능 인덱스 요청 대신 **자연 PK 추가** 제안 — §6 참조

---

## 1. 배경

대시보드 배치를 CRM MSSQL 직접연결 → RDS Postgres 데이터 플랫폼(`bnviit_datawarehouse.raw.raw_crm_*`) 으로 이관.
**CRM 이관 스코프 29/29 코드완료** (2026-10-07 · BATCH_SOURCE 11 · MART_DIRECT 5 · RECONCILE 11 · QUERY_DIRECT 2). 상세는 `docs/data-platform/migration-strategy.md` §9.

**2026-10-08 CRM 3개 raw 적재 완료** (`raw_crm_custom_history`·`raw_crm_lens`·`raw_crm_lens_cfg`) — raw 커버리지 55 테이블·2064 컬럼 (문서 하단 raw-columns.txt 참조). OverseasMarketing 수동 매칭 팝업(`findCustomerDetails`) 전용 3개 신규 인덱스 Stage 3 에 추가.

배치 실행 시 **raw 스키마에 인덱스가 없어** 대다수 쿼리가 매번 수백만 행 전체 스캔. 코드는 정확하나 프로덕션 사용 불가능한 성능인 도메인이 있음 (A5 exam · A6 reservation).

---

## 2. 실 배치 관측 결과 (2026-09-30 로컬 검증)

**모든 배치가 웨어하우스로 라우팅되어 성공 완료. 성능 프로파일 3그룹**:

| 그룹 | 도메인 | 실 관측 시간 | 실용 판단 |
|---|---|---|---|
| ✅ 실용 | A1 reservation-change | 22초 (1일) | 일간 OK · 월간·백필은 인덱스 |
| ✅ 실용 | A2 accumulated-eye | ~1초 | 모두 OK |
| ✅ 실용 | A3 outpatient | 17초 (2일) | 모두 OK |
| ✅ 실용 | A4 surgery | 78초 (2일) | 일간 OK · 30일+ 인덱스 |
| ⚠️ 일간만 | **A5 exam** | **14분 17초 (2일)** | **일간 OK · 월간(30일) ~3~4시간 실용불가** |
| ⚠️ 일간만 | **A6 reservation-list** | **6분 19초 (1일)** | **일간 OK · 월간·백필 인덱스 필수** |
| ✅ 초고속 | A7 accounting-vision | 1.4초 (1일) | 모두 OK |
| ✅ 완료 | A8 accounting-medical | — | 2026-10-06 쌍 모델 4개 적재 확인 후 이관 완료 |

**계측 상세 (A1 reserve_history 정밀 계측)**:
- 테이블: `raw.raw_crm_reserve_history` — **6,890,796 rows · 인덱스 0개**
- 1일 범위 CTE 실행 시간: **6,643 ms**
- 실행 계획: `Parallel Seq Scan` (workers=2) · `Rows Removed by Filter: 2,296,589/worker`
- I/O: `shared read=15,054 ms` (병렬 분산으로 wall 6.6s), Buffers `read=241,280 cold`
- 매칭 결과: 746 rows (전체의 **0.01%**)
- 인덱스 반영 시 예상: 6.6초 → **50~100ms** (20~40배 개선)

---

## 3. 단계별 인덱스 요청 (총 **39개 성능 인덱스** · 4단계 순차 반영 · 2026-10-08 극소형 테이블 8개 PK 요청으로 전환)

**단계 설계 원칙** (2026-10-08 데이터 분포 실측 반영):
- **Stage 1 — Critical path · BATCH_SOURCE 월간 unblock** (12개): A1·A5·A6 월간 재계산 즉시 가능화. **가장 급함**
- **Stage 2 — 매일 배치 성능** (17개 · EICN 2개 포함 · db_custom·db_recounsel·reservation_naver 4개 추가): A4 Surgery 30일 + MART_DIRECT 매일 집계 + Homepage 매일 + 미요청 테이블 보강
- **Stage 3 — 조회·월간·UX** (16개 · paytrans·receiptcash 2개 추가): JOIN 최적화 + OverseasMarketing + A8 Medical EMR 월간 그래프 (A8 보조 테이블 전수 커버)
- **Stage 4 — 백필·과거 재계산** (3개): 초기 적재/과거 소급 재계산 전용

**2026-10-08 데이터 분포 실측 재최적화**:
```
변경 1 — EICN 리딩 간소화:
  (stat_date, dcontext, hunt_number) → (stat_date, hunt_number)
  (stat_date, dcontext, group_code)  → (stat_date, group_code)
  근거: dcontext='hunt_context' 가 171,206/182,186 = 94% → 리딩 효과 없음

변경 2 — Homepage 리딩 간소화 (부분 인덱스):
  (category, del_tf, reg_dt DESC) → (category, reg_dt DESC) WHERE del_tf='N'
  근거: del_tf='N' 이 625,127/626,303 = 99.8% → 리딩 효과 없음, 부분 인덱스가 더 작고 빠름

추가 6개 — raw-columns.txt 교차 재조사로 미요청 발견:
  Stage 2-B: db_custom (assign_date) · db_custom (reserve_num) · db_recounsel (inserteddatetime) · reservation_naver (nrsrgtdtm)
  Stage 3-C: paytrans (hospcode, ptntidno, 수납일자, 일련번호) · receiptcash (hospcode, ptntidno)
```

**PK 중복 실측 결과 (2026-10-08 최종 전수 재점검)**:
```sql
-- raw 스키마 전체 PK/UNIQUE 인덱스 전수 (16개 존재, 전부 PK 뿐)
-- data warehouse 직접 쿼리로 확정. 성능용 non-unique 인덱스는 전무.
-- 환자당 1행 덮어쓰기 테이블(exam·operationdata)은 PK scan 로 완전 커버.
raw_crm_custom (cust_num)                        → ❌ PK 이미 있음, 요청 삭제
raw_crm_cataract_operationdata (cust_num)        → ❌ PK 이미 있음, 요청 삭제
raw_crm_exam (cust_num, exam_date DESC)          → ❌ PK=cust_num + 환자당 1행, PK scan 커버, 요청 삭제
raw_crm_operationdata (cust_num, operation_date) → ❌ PK=cust_num + 환자당 1행, PK scan 커버, 요청 삭제
```

**순차 반영이 가능한 이유**: 각 Stage 는 독립적인 배치 그룹을 unblock. Stage 1 만 반영해도 월간 재계산 즉시 가능. Stage 2 는 매일 배치 성능, Stage 3 는 사용자 조회 UX, Stage 4 는 과거 데이터 재계산 전용.

**정합성 검증 노트 (2026-09-30)**: 원안 25개에서 **`raw_crm_cataract_exam (cust_num, exam_date)`** 1건은 Stage 1 의 `(cust_num, exam_date DESC, seq DESC)` 리딩 컬럼으로 커버돼 삭제.
**2026-10-08 정밀 검토 추가 발견 (17개)**: operationdata LATERAL 리딩 반대 1 · MART_DIRECT 매일 집계 7 (HappyTalk 4 + CTI 2 + EICN 1) · Homepage 매일 1 · A8 EMR 월간 7 · B2B 백필 1.

**순차 반영이 가능한 이유**: 각 Stage 는 독립적인 배치 그룹을 unblock. Stage 1 만 반영해도 월간 재계산 즉시 가능 — 나머지는 운영 안정화 후 반영 가능.

**정합성 검증 노트 (2026-09-30)**: 원안 25개에서 **`raw_crm_cataract_exam (cust_num, exam_date)`** 1건은 Stage 1 의 `(cust_num, exam_date DESC, seq DESC)` 리딩 컬럼으로 커버돼 삭제. 총 24개로 확정. 상세 근거: `select-exam-list.sql:250~256`.

### Stage 1 — Critical path · A5·A6·A1 월간·백필 unblock (11개 · 최우선 · ~~custom·exam·operationdata·medical_sub_cfg(PK 요청 전환) 4개 삭제~~)

**효과**: A5 exam 14분 → 수 초 · A6 reservation 6분 → 수십 초 · A1 reservation-change 22초 → 1~2초. **월간 재계산·초기 백필 실용화의 유일한 조건**.

**포함 그룹 (4소그룹)**:

| 소그룹 | # | 테이블 | 인덱스 컬럼 | 사용처 · 근거 |
|---|---|---|---|---|
| **1-A 공통 JOIN** (2개 · ~~custom 삭제~~) | ~~1~~ | ~~`raw.raw_crm_custom`~~ | ~~`(cust_num)`~~ | ❌ **2026-10-08 PK 중복 확인 → 삭제** (실측: PK=cust_num 이미 설정됨) |
| | 1 | `raw.raw_crm_employee` | `(emp_num)` 또는 PK | Surgery·Exam·Outpatient 상담사·집도의·검안사 3~4 alias (PK 없음 실측) |
| | 2 | `raw.raw_crm_reservation` | `(cust_num, reserve_date, reserve_flag, reserve_state)` | 6.9M rows · Exam·Surgery·Outpatient EXISTS/LATERAL (PK=reserve_num 과 다른 리딩) |
| **1-B A5 exam LATERAL+pay** (7개 · ~~#4 PK 중복 삭제~~) | ~~4~~ | ~~`raw.raw_crm_exam`~~ | ~~`(cust_num, exam_date DESC)`~~ | ❌ **2026-10-08 PK 중복 재확인 → 삭제** (실측: PK=cust_num + EXAM 환자당 1행 덮어쓰기 → PK scan 로 완전 커버) |
| | 4 | `raw.raw_crm_exam` | `(exam_date)` | A5 `ExamListRepository` WHERE 필터 (전체 400K+ 행 중 기간 수만 행 선택) |
| | 6 | `raw.raw_crm_cataract_exam` | `(cust_num, exam_date DESC, seq DESC)` | A4·A5 cataract_exam LATERAL · A5 NOT EXISTS 커버 |
| | 7 | `raw.raw_crm_medical_sub_cfg` | `(reserve_flag, sub_flag)` | A5 ExamList / CataractExamList JOIN |
| | 8 | `raw.raw_crm_costprice` | `(cust_num, cost_date)` | **A5 검증 실패 핵심 원인** · A4 pay LATERAL + A5 pay 서브쿼리 + A4 Reoperation payment |
| | 9 | `raw.raw_crm_cstprcsub` | `(cstcusnum, cstseq)` | **A5 검증 실패 원인 (전체 스캔+GROUP BY)** · A5 exam pay 3-way UNION |
| | 10 | `raw.raw_crm_prcitmlst` | `(prccusnum, prcseq)` | **A5 검증 실패 원인** · A5 exam pay UNION |
| | 11 | `raw.raw_crm_prcitmdtl` | `(prccusnum, prcseq, prccod)` | **A5 검증 실패 원인** · A5 exam pay UNION |
| **1-C A1·A6 공용** (2개) | 12 | `raw.raw_crm_reserve_history` | `(history_time)` | **계측 22초 → 1~2초** · A1 `ReservationChangeMartJob` |
| | 13 | `raw.raw_crm_motive_new02` | `(cust_num, idx)` | A3·A4·A5·A6 motive LATERAL 공용 |
| ~~**1-D A5 LATERAL 보강**~~ (0개 · 2026-10-08 PK 중복 재확인 → 삭제) | ~~14~~ | ~~`raw.raw_crm_operationdata`~~ | ~~`(cust_num, operation_date)`~~ | ❌ **PK 중복** (실측: PK=cust_num + OPERATIONDATA 환자당 1행 덮어쓰기 → PK scan 로 완전 커버. 복합 인덱스 불필요) |

### Stage 2 — 매일 배치 성능 (15개 · A4 Surgery + MART_DIRECT 매일 집계 + Homepage · EICN 2개 포함 · ~~happytalk_category01·02(PK 요청 전환) 2개 삭제~~)

**효과**:
- **2-A**: A4 SurgeryMartJob 2일 78초 → 30일 완주
- **2-B**: MART_DIRECT 2개 리포 (ReservationStatsSystem · CataractStatsSystem) 매일 집계 성능 개선 + db_custom·db_recounsel·reservation_naver 보강
- **2-C**: HomepageMartJob 매일 배치 성능 개선 (부분 인덱스)

**2-A A4 Surgery 30일 지원 (4개 · ~~cataract_operationdata (cust_num) PK 중복 삭제~~)**:

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 15 | `raw.raw_crm_operationdata` | `(operation_date, cust_num)` | A4 `SurgeryListRepository` 시력교정 파트 WHERE 기간 필터 |
| ~~16~~ | ~~`raw.raw_crm_cataract_operationdata`~~ | ~~`(cust_num)`~~ | ❌ **2026-10-08 PK 중복 확인 → 삭제** (실측: PK=cust_num 이미 설정됨) |
| 17 | `raw.raw_crm_cataract_operationdata` | `(operationr_date)` | A4 SurgeryList `cataract_ops` CTE (백내장 우안) |
| 18 | `raw.raw_crm_cataract_operationdata` | `(operationl_date)` | A4 SurgeryList `cataract_ops` CTE (백내장 좌안) |
| 19 | `raw.raw_crm_re_operation` | `(reop_date, cust_num)` | A4 `ReoperationCandidateRepository` 필터 |

**2-B MART_DIRECT 매일 집계 — HappyTalk + CTI + EICN (7개 · 2026-10-08 추가)**:

사용처: `ReservationStatsSystemRepository` · `CataractStatsSystemRepository` 가 `mart_reservation_stats_{system,cataract}_daily` 를 **매일 집계**. 지금 인덱스 없으면 매일 수백만 행 seq scan.

| # | 테이블 | 인덱스 컬럼 | 사용처 · 쿼리 패턴 |
|---|---|---|---|
| 20 | `raw.raw_crm_happytalk_counsel_list` | `(inserteddatetime)` | `WHERE inserteddatetime >= :from AND < :to+1day` — timestamp 범위 필터 |
| 21 | `raw.raw_crm_happytalk_mapping` | `(happytalk_num)` 또는 PK | `JOIN m ON h.happytalk_num = m.happytalk_num` |
| 22 | `raw.raw_crm_happytalk_category01` | `(seq)` 또는 PK | `JOIN c01 ON c01.seq = h.category01` |
| 23 | `raw.raw_crm_happytalk_category02` | `(pkey, fkey)` 또는 PK 복합 | `JOIN c02 ON c02.pkey = h.category02 AND c02.fkey = h.category01` |
| 24 | `raw.raw_crm_ctirptlst` | `(ctirgtdtm)` | `WHERE a.ctirgtdtm >= :from AND < :to+1day` — timestamp 범위 |
| 25 | `raw.raw_crm_cticlg` | `(clgnum)` 또는 PK | `JOIN cticlg b ON a.cticallid = b.clgnum` |
| 26 | `raw.raw_eicn_stat_user_inbound_bseye` | **`(stat_date, hunt_number)`** + **`(stat_date, group_code)`** (2026-10-08 데이터 분포 실측 반영: dcontext='hunt_context' 94% 선택도 → 리딩 제거) | `WHERE stat_date BETWEEN :from AND :to AND dcontext='hunt_context' AND (hunt_number IN (...) OR group_code='0016')` — EICN 매일 집계 양쪽 리포 공용 |

**2-B 추가 4개 (2026-10-08 미요청 테이블 보강)**:

실제 쿼리 사용 중이지만 지금까지 요청 안 됨 (raw-columns.txt 기반 재조사 발견).

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 27 | `raw.raw_crm_db_custom` | `(assign_date)` | ReservationStatsSystem 외 다수 · `WHERE assign_date >= :from AND < :to+1day` timestamp 범위 |
| 28 | `raw.raw_crm_db_custom` | `(reserve_num)` | ReservationStatsSystem JOIN · `JOIN d.reserve_num = r.reserve_num` |
| 29 | `raw.raw_crm_db_recounsel` | `(inserteddatetime)` | ReservationStatsSystem · `WHERE inserteddatetime >= :from AND < :to+1day` |
| 30 | `raw.raw_crm_reservation_naver` | `(nrsrgtdtm)` | ReservationOverallStats · `WHERE nrsrgtdtm >= :from AND < :to+1day` |

**2-C Homepage 매일 배치 (1개 · 2026-10-08 부분 인덱스로 간소화)**:

사용처: `ReservationListHomepageRepository` → `HomepageMartJob` 매일 배치. `WHERE category='COUNSELONLINE' AND del_tf='N'` 복합 필터.

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 31 | `raw.raw_homepage_tbl_counsel` | **`(category, reg_dt DESC) WHERE del_tf = 'N'`** (부분 인덱스 · 2026-10-08 데이터 분포 반영: del_tf='N' 99.8% 선택도 → 리딩에서 제거하고 부분 조건으로 전환) | `WHERE category='COUNSELONLINE' AND del_tf='N' ORDER BY reg_dt DESC` |

### Stage 3 — 조회·월간·UX (11개 · JOIN 최적화 + OverseasMarketing + A8 EMR 전수 · ~~cancel_cfg·nationcustom_cfg·etccfg·lens_cfg·setkind(PK 요청 전환) 5개 삭제~~)

**효과**:
- **3-A**: JOIN semi-join 성능 개선
- **3-B**: OverseasMarketing 수동 매칭 팝업 응답 속도
- **3-C**: A8 Medical EMR 월간 그래프 성능

Stage 1·2 완료 후 안정화 단계에서 반영.

**3-A JOIN 최적화 (4개)**:

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 28 | `raw.raw_crm_reserve_history` | `(reserve_num)` | A1 outer JOIN 키 (`select-reservation-change-history.sql:44`) — #12 와 리딩 컬럼 달라 별도 필요 |
| 29 | `raw.raw_crm_cancel_cfg` | `(cancel_cd)` 또는 PK | A5 JOIN 키 |
| 30 | `raw.raw_crm_nationcustom_cfg` | `(code)` 또는 PK | A3·A4·A5 nationality JOIN 키 |
| 31 | `raw.raw_crm_etccfg` | `(etcbsecod, etccod)` | A3·A4·A5 insurance JOIN 키 |

**3-B OverseasMarketing `findCustomerDetails` (3개 · 2026-10-08 CRM 3개 적재 완료 반영)**:

사용처는 `OverseasMarketingRepository.findCustomerDetails` 1개 메서드. 수동 매칭 팝업 셀 클릭 시 호출 (단건·소수 고객). `WHERE c.cust_num IN (:customerNos)` 로 특정 고객만 조회. 참조 쿼리: `sql/warehouse/marketing/customer-details.sql`.

| # | 테이블 | 인덱스 컬럼 | 사용처 · 쿼리 패턴 |
|---|---|---|---|
| 32 | `raw.raw_crm_custom_history` | `(cust_num)` | `MIN(reg_date) FROM custom_history WHERE cust_num = :c` — 고객 최초 등록일 (`customer-details.sql:37`) |
| 33 | `raw.raw_crm_lens` | `(cust_num, seq)` | `WHERE cust_num = :c AND seq = 1 LIMIT 1` — 드림렌즈 처방 이력 (`customer-details.sql:78`) |
| 34 | `raw.raw_crm_lens_cfg` | `(lens_cd)` 또는 PK | `JOIN lens_cfg lt ON lt.lens_cd = l.lens_gubun` — 드림렌즈 종류명 (`customer-details.sql:76~77`) |

**3-C A8 Medical EMR 월간 그래프 (9개 · 2026-10-08 보조 테이블 전수 커버)**:

사용처: `AccountingMartJob` medical 월별 그래프 — `MedicalReceiptSourceRepository` 가 월별 집계. `paosunab`·`paisunab` (최대 1.7M행) + 보조 테이블 전수. 지금 인덱스 없음.

⚠️ **한글 컬럼명 주의** — `paosunab`/`paisunab`/`paytrans` 의 `수납일자`·`진료일자` 는 한글. CREATE INDEX 시 double-quote 필수.

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 35 | `raw.raw_emr_paosunab` | `("수납일자")` | `WHERE 수납일자 >= :from AND 수납일자 <= :to` — 외래 수납 구 (1.7M행) |
| 36 | `raw.raw_emr_paisunab` | `("수납일자")` | 동일 — 입원 수납 구 (9.6K행) |
| 37 | `raw.raw_emr_paosunab_new` | `("수납일자")` | 외래 수납 신 (50K행) |
| 38 | `raw.raw_emr_paisunab_new` | `("수납일자")` | 입원 수납 신 (551행) |
| 39 | `raw.raw_emr_pmcptnt` | `(hospcode, ptntidno)` | `JOIN P ON P.hospcode = A.hospcode AND P.ptntidno = A.ptntidno` — 환자 마스터 |
| 40 | `raw.raw_emr_setkind` | `(kindkey)` 또는 PK | `JOIN K ON K.kindkey = A.보험유형` — 보험 종별 |
| 41 | `raw.raw_emr_picuserm` | `(hospcode, userid)` | `JOIN D ON D.hospcode = A.hospcode AND D.userid = A.진료의사` — 사용자 마스터 |
| 42 | `raw.raw_emr_paytrans` | `(hospcode, ptntidno, "수납일자", 일련번호)` | A8 상세 분석 서브쿼리 다수: 환불·미수·결제구분별 집계 (`결제구분 IN ('80','81','82','90','91','92','93')`) |
| 43 | `raw.raw_emr_receiptcash` | `(hospcode, ptntidno)` | A8 상세 분석 — `WHERE RC.hospcode=A.hospcode AND RC.ptntidno=A.ptntidno` |

### Stage 4 — 백필·과거 재계산 (3개 · P3 격)

**효과**: 초기 적재(2022~) 재계산 시에만 필요. 평시 배치에는 영향 작음.

| # | 테이블 | 인덱스 컬럼 | 사용처 |
|---|---|---|---|
| 44 | `raw.raw_crm_motive_new01` | `(pkey)` 또는 PK | motive_new02 → motive_new01 캐스케이드 JOIN (`m2.fkey = m1.pkey`) |
| 45 | `raw.raw_crm_operation_accumulated_eye_count` | `(operation_date)` | A2 (완료됐으나 백필 시 필요) |
| 46 | `raw.raw_crm_motive_new01` | `(cust_num)` | B2B `select-b2b-cataract-exam-rows.sql` 전용 — `JOIN motive_new01 mo ON mo.cust_num = ex.cust_num` (#44 pkey 리딩과 다른 패턴). B2B 월간 백필 시만 필요. |

---

## 4. 단계별 복사용 SQL

> **공통 주의**: Postgres 는 `CREATE INDEX` 가 기본 lock 을 짧게만 잡지만 수백만 행 테이블은 오래 걸림. **운영 영향 최소화 권장**:
> - `CREATE INDEX CONCURRENTLY` 사용 (트랜잭션 밖 · 온라인 생성 · 다른 쓰기 블록 안 함)
> - `IF NOT EXISTS` 로 중복 실행 안전
> - Stage 간 간격 두고 반영하면서 각 Stage 종료 시 대시보드 팀이 배치 재검증 (§5)

### Stage 1 — Critical path (11개 · ~~custom·exam·operationdata·medical_sub_cfg(PK 요청 전환) 4개 삭제~~)

```sql
-- ─────────────────────────────────────────────
-- Stage 1-A · 공통 JOIN (2개 · 모든 도메인 혜택)
--   ⚠️ 2026-10-08 PK 실측: raw_crm_custom.cust_num 은 이미 PK → 요청 삭제
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_employee_emp_num
  ON raw.raw_crm_employee (emp_num);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_reservation_multi
  ON raw.raw_crm_reservation (cust_num, reserve_date, reserve_flag, reserve_state);

-- ─────────────────────────────────────────────
-- Stage 1-B · A5 exam LATERAL + pay 서브쿼리 (7개 · ~~exam (cust_num, exam_date DESC) PK 중복 삭제~~)
--   현재 14분/2일 → 수 초/2일 (30일 완주 가능)
--   ⚠️ 2026-10-08 PK 실측: raw_crm_exam.cust_num 은 PK + EXAM 환자당 1행 → (cust_num, exam_date DESC) 는 PK scan 로 완전 커버 → 요청 삭제
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_exam_date
  ON raw.raw_crm_exam (exam_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_cataract_exam_cust_date_seq
  ON raw.raw_crm_cataract_exam (cust_num, exam_date DESC, seq DESC);
-- 주: raw_crm_cataract_exam (cust_num, exam_date) 는 위 인덱스
--     리딩 컬럼으로 커버되어 별도 생성 불필요 (2026-09-30 검증)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_costprice_cust_date
  ON raw.raw_crm_costprice (cust_num, cost_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_cstprcsub_key
  ON raw.raw_crm_cstprcsub (cstcusnum, cstseq);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_prcitmlst_key
  ON raw.raw_crm_prcitmlst (prccusnum, prcseq);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_prcitmdtl_key
  ON raw.raw_crm_prcitmdtl (prccusnum, prcseq, prccod);

-- ─────────────────────────────────────────────
-- Stage 1-C · A1 reservation-change + A3·A4·A5·A6 공용 motive (2개)
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_reserve_history_time
  ON raw.raw_crm_reserve_history (history_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_motive_new02_cust_idx
  ON raw.raw_crm_motive_new02 (cust_num, idx);

-- ⚠️ Stage 1-D 는 2026-10-08 PK 재확인으로 삭제됨
--   raw_crm_operationdata.cust_num 은 PK + OPERATIONDATA 환자당 1행
--   → (cust_num, operation_date) 는 PK scan 로 완전 커버. 요청 불필요.
```

### Stage 2 — 매일 배치 성능 (15개 · EICN 2개 포함)

```sql
-- ─────────────────────────────────────────────
-- Stage 2-A · A4 SurgeryMartJob 30일 EOFException 해결 (5개)
--   현재 78초/2일 → 30일 완주 가능
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_operationdata_date
  ON raw.raw_crm_operationdata (operation_date, cust_num);

-- ⚠️ 2026-10-08 PK 실측: raw_crm_cataract_operationdata.cust_num 은 이미 PK → 요청 삭제

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_cataract_operationdata_r_date
  ON raw.raw_crm_cataract_operationdata (operationr_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_cataract_operationdata_l_date
  ON raw.raw_crm_cataract_operationdata (operationl_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_re_operation_date
  ON raw.raw_crm_re_operation (reop_date, cust_num);

-- ─────────────────────────────────────────────
-- Stage 2-B · MART_DIRECT 매일 집계 — HappyTalk + CTI + EICN (7개 · 2026-10-08 추가)
--   ReservationStatsSystem · CataractStatsSystem 매일 집계
--   mart_reservation_stats_{system,cataract}_daily
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_happytalk_counsel_list_dt
  ON raw.raw_crm_happytalk_counsel_list (inserteddatetime);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_happytalk_mapping_num
  ON raw.raw_crm_happytalk_mapping (happytalk_num);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_ctirptlst_dtm
  ON raw.raw_crm_ctirptlst (ctirgtdtm);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_cticlg_num
  ON raw.raw_crm_cticlg (clgnum);

-- EICN: 2026-10-08 데이터 분포 실측 반영 — dcontext='hunt_context' 94% 선택도 → 리딩 제거
--   hunt_number IN (...) 와 group_code = ... 두 가지 필터 각각 (stat_date) 리딩
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_eicn_stat_date_hunt
  ON raw.raw_eicn_stat_user_inbound_bseye (stat_date, hunt_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_eicn_stat_date_group
  ON raw.raw_eicn_stat_user_inbound_bseye (stat_date, group_code);

-- ─────────────────────────────────────────────
-- Stage 2-B 추가 · 미요청 테이블 보강 (4개 · 2026-10-08)
--   raw-columns.txt 기반 재조사로 실제 쿼리 사용 중이지만 요청 안 됐던 것
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_db_custom_assign_date
  ON raw.raw_crm_db_custom (assign_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_db_custom_reserve_num
  ON raw.raw_crm_db_custom (reserve_num);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_db_recounsel_dt
  ON raw.raw_crm_db_recounsel (inserteddatetime);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_reservation_naver_dtm
  ON raw.raw_crm_reservation_naver (nrsrgtdtm);

-- ─────────────────────────────────────────────
-- Stage 2-C · Homepage 매일 배치 (1개 · 2026-10-08 부분 인덱스로 간소화)
--   ReservationListHomepageRepository · HomepageMartJob
--   WHERE category='COUNSELONLINE' AND del_tf='N' ORDER BY reg_dt DESC
--   del_tf='N' 가 99.8% 선택도 → 리딩에서 제거하고 부분 조건으로 전환
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_homepage_tbl_counsel_cat_date
  ON raw.raw_homepage_tbl_counsel (category, reg_dt DESC)
  WHERE del_tf = 'N';
```

### Stage 3 — 조회·월간·UX (11개 · A8 보조 테이블 전수 · ~~5개 PK 요청 전환~~)

```sql
-- ─────────────────────────────────────────────
-- Stage 3-A · JOIN 키 최적화 (Stage 1·2 완료 후)
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_reserve_history_num
  ON raw.raw_crm_reserve_history (reserve_num);

-- ─────────────────────────────────────────────
-- Stage 3-B · OverseasMarketing 수동 매칭 팝업 (2026-10-08 CRM 3개 적재 완료)
--   sql/warehouse/marketing/customer-details.sql — findCustomerDetails 전용
--   수동 매칭 셀 클릭 시 호출 (단건·소수 고객)
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_custom_history_cust
  ON raw.raw_crm_custom_history (cust_num);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_lens_cust_seq
  ON raw.raw_crm_lens (cust_num, seq);

-- ─────────────────────────────────────────────
-- Stage 3-C · A8 Medical EMR 월간 그래프 (7개 · 2026-10-08 추가)
--   AccountingMartJob medical 월별 그래프
--   MedicalReceiptSourceRepository — 월별 수납 집계 (1.7M + 50K + 9.6K + 551 행)
-- ⚠️ 한글 컬럼명 "수납일자" — double-quote 필수
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_paosunab_date
  ON raw.raw_emr_paosunab ("수납일자");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_paisunab_date
  ON raw.raw_emr_paisunab ("수납일자");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_paosunab_new_date
  ON raw.raw_emr_paosunab_new ("수납일자");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_paisunab_new_date
  ON raw.raw_emr_paisunab_new ("수납일자");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_pmcptnt_keys
  ON raw.raw_emr_pmcptnt (hospcode, ptntidno);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_picuserm_keys
  ON raw.raw_emr_picuserm (hospcode, userid);

-- 2026-10-08 추가: A8 상세 분석 서브쿼리 보강 (paytrans · receiptcash)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_paytrans_keys
  ON raw.raw_emr_paytrans (hospcode, ptntidno, "수납일자", 일련번호);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_receiptcash_keys
  ON raw.raw_emr_receiptcash (hospcode, ptntidno);
```

### Stage 4 — 백필·과거 재계산 (3개)

```sql
-- ─────────────────────────────────────────────
-- Stage 4 · 백필용 (초기 적재/과거 재계산 시에만 필요)
-- ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_motive_new01_pkey
  ON raw.raw_crm_motive_new01 (pkey);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_operation_accumulated_eye_count_date
  ON raw.raw_crm_operation_accumulated_eye_count (operation_date);

-- 2026-10-08 추가: B2B 월간 백필 전용
-- B2bRevenueStatsRepository select-b2b-cataract-exam-rows.sql
-- JOIN motive_new01 mo ON mo.cust_num = ex.cust_num (리딩 cust_num)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_motive_new01_cust
  ON raw.raw_crm_motive_new01 (cust_num);
```

**총 39개 성능 인덱스** (Stage 1: **11** · Stage 2: **15** (EICN #26 은 hunt_number 와 group_code 2개로 분리 생성) · Stage 3: **11** · Stage 4: **3** · 2026-10-08 극소형 테이블 8개 PK 요청으로 전환 → 성능 인덱스 **39** + PK 추가 요청 **8** = §6 참조).

---

## 5. 단계별 검증 방법

각 Stage 반영 후 대시보드 팀이 해당 배치를 재실행해 성능 측정. **다음 Stage 는 이전 Stage 검증 통과 후 진행** (문제 생기면 범위 축소 가능).

### Stage 1 검증

| 배치 | 반영 전 | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `ReservationChangeMartJob` (A1) | 22초 (1일) | **1~2초** | 1일 5초 이내 |
| `ExamMartJob` (A5) | **14분 17초 (2일)** | **10~30초 (2일)** | 2일 1분 이내 · 30일 5분 이내 완주 |
| `ReservationMartJob` (A6) | 6분 19초 (1일) | **10~30초 (1일)** | 1일 1분 이내 · 30일 10분 이내 완주 |

**EXPLAIN 체크**: A5 pay 서브쿼리(`cstprcsub`·`prcitmlst`·`prcitmdtl` 조회) 가 `Index Scan` 사용하는지 확인.

### Stage 2 검증

**2-A A4 Surgery**:

| 배치 | 반영 전 | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `SurgeryMartJob` (A4) | 78초 (2일) · 30일 EOFException | **10~20초 (2일)** | 30일 완주 (현재 timeout) |

**EXPLAIN 체크**: `cataract_ops` CTE 가 `operationr_date`·`operationl_date` 인덱스 사용.

**2-B MART_DIRECT 매일 집계**:

| 배치 | 반영 전 (추정) | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `ReservationStatsDailyMartJob` (system+cataract) | 수십 초~분 (매일) | **5~10초** | 매일 배치 1분 이내 |

**EXPLAIN 체크**: `happytalk_counsel_list (inserteddatetime)` 범위 scan · EICN 복합 인덱스 사용.

**2-C Homepage 매일**:

| 배치 | 반영 전 (추정) | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `HomepageMartJob` | 알 수 없음 (측정 전) | **1~3초** | SSH 터널 기준 안정화 |

**EXPLAIN 체크**: `(category, del_tf, reg_dt DESC)` 복합 인덱스 사용.

### Stage 3 검증

**3-A JOIN 최적화**: Stage 1·2 완료 후 평시 운영에서 약간의 성능 개선 관찰. 별도 긴급 검증 불필요.

**3-B OverseasMarketing 수동 매칭 팝업**: `GET /api/overseas-marketing/crm-customers/{customerNo}` 호출 응답 시간.

| 호출 | 반영 전 (추정) | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `findCustomerDetails` 단건 | ~500ms~2초 (seq scan × 3개 테이블) | **50~200ms** | 1초 이내 (사용자 체감 즉시) |

**EXPLAIN 체크**: `custom_history (cust_num)` · `lens (cust_num, seq)` · `lens_cfg (lens_cd)` 전부 Index Scan 사용.

**3-C A8 Medical EMR 월간 그래프**:

| 배치 | 반영 전 (측정 X) | 반영 후 기대 | 성공 판정 |
|---|---|---|---|
| `AccountingMartJob` medical 월별 | 수십 초~수 분 (1.7M + 50K + 9.6K + 551 UNION) | **3~10초** | 월 1회 재집계 1분 이내 |

**EXPLAIN 체크**: `paosunab("수납일자")` · `paisunab("수납일자")` · `pmcptnt(hospcode, ptntidno)` 전부 Index Scan.

### Stage 4 검증

초기 백필 또는 과거 재계산(2022~) 수행 시에만 효과 확인.

---

## 6. 부가 요청 (별도 트랙)

### 6.0 자연 PK 추가 제안 (8개 · 성능 인덱스 요청 대체)

**배경**: 지금까지 성능 인덱스로 요청하려 했던 8개 테이블이 **극소형 코드/카테고리 테이블** (7~1,661 행)로, 성능 인덱스보다 **자연 PK 설정이 설계상 적절**. 데이터 플랫폼 팀이 이 테이블들에 자연 PK 설정 가능한지 검토 후 적용 부탁.

**장점**:
- Unique 제약으로 데이터 무결성 보장 (ETL 시 중복 방지)
- 자동 unique btree 인덱스 생성 → 우리 쿼리 자동 index-only scan
- 메타데이터 완결성 ↑
- 성능 인덱스 요청 중복 제거

**근거 — 왜 성능 인덱스 아님?**: Postgres 는 1~2 페이지 테이블에서 **seq scan 이 인덱스 lookup 보다 빠름** (I/O 1회 vs 인덱스+테이블 2회). 이 8개는 전부 1 페이지 (8KB) 또는 수백KB 수준이라 성능 인덱스 ROI 없음.

| 테이블 | 행 수 | PK 제안 컬럼 | ALTER TABLE 쿼리 |
|---|---|---|---|
| `raw.raw_crm_cancel_cfg` | 84 | `(cancel_cd)` | `ALTER TABLE raw.raw_crm_cancel_cfg ADD CONSTRAINT raw_crm_cancel_cfg_pkey PRIMARY KEY (cancel_cd);` |
| `raw.raw_crm_nationcustom_cfg` | 59 | `(code)` | `ALTER TABLE raw.raw_crm_nationcustom_cfg ADD CONSTRAINT raw_crm_nationcustom_cfg_pkey PRIMARY KEY (code);` |
| `raw.raw_crm_etccfg` | 1,661 | `(etcbsecod, etccod)` | `ALTER TABLE raw.raw_crm_etccfg ADD CONSTRAINT raw_crm_etccfg_pkey PRIMARY KEY (etcbsecod, etccod);` |
| `raw.raw_crm_lens_cfg` | 25 | `(lens_cd)` | `ALTER TABLE raw.raw_crm_lens_cfg ADD CONSTRAINT raw_crm_lens_cfg_pkey PRIMARY KEY (lens_cd);` |
| `raw.raw_emr_setkind` | 20 | `(kindkey)` | `ALTER TABLE raw.raw_emr_setkind ADD CONSTRAINT raw_emr_setkind_pkey PRIMARY KEY (kindkey);` |
| `raw.raw_crm_happytalk_category01` | 7 | `(seq)` | `ALTER TABLE raw.raw_crm_happytalk_category01 ADD CONSTRAINT raw_crm_happytalk_category01_pkey PRIMARY KEY (seq);` |
| `raw.raw_crm_happytalk_category02` | 54 | `(pkey, fkey)` | `ALTER TABLE raw.raw_crm_happytalk_category02 ADD CONSTRAINT raw_crm_happytalk_category02_pkey PRIMARY KEY (pkey, fkey);` |
| `raw.raw_crm_medical_sub_cfg` | 97 | `(reserve_flag, sub_flag)` | `ALTER TABLE raw.raw_crm_medical_sub_cfg ADD CONSTRAINT raw_crm_medical_sub_cfg_pkey PRIMARY KEY (reserve_flag, sub_flag);` |

**확인 사항**: 각 PK 제안 컬럼이 실제로 unique 한지 데이터 플랫폼 팀 확인 필요. 불가능한 경우(중복 데이터 존재) → UNIQUE 대신 NON-UNIQUE INDEX 로 전환.

---

### 6.1 ~~CRM 3개 raw 테이블 신규 적재 요청~~ ✅ **완료 (2026-10-08)**

> 상세: `migration-strategy.md` §11.7

OverseasMarketing 리포 운영 전환(`data-platform.enabled=true`) 의 유일한 블로커였음 — **2026-10-08 데이터 플랫폼 팀이 3개 전부 적재 완료**. 외부 DB 참조 53개 → **56개 커버리지 100%** 달성.

| 테이블 | 원천 (MSSQL SOFTCRM) | 적재 상태 | 컬럼 수 |
|---|---|---|---|
| `raw.raw_crm_custom_history` | `CUSTOM_HISTORY` | ✅ 적재 완료 | 22 |
| `raw.raw_crm_lens` | `LENS` | ✅ 적재 완료 | 37 |
| `raw.raw_crm_lens_cfg` | `LENS_CFG` | ✅ 적재 완료 | 8 |

사용처는 `OverseasMarketingRepository.findCustomerDetails` 1개 메서드에만 — 수동 매칭 팝업의 미리보기 UI 전용 필드(`registeredDate`·`dreamlens`). 다른 리포·SQL 어디서도 참조 없음(재검증 완료).

**다음 단계** — 성능 인덱스는 Stage 3-B 로 요청 (위 §3 참조). 운영 전환은 수치 대조 후 결정.

### 6.2 ~~`raw_emr_paisunab` 적재~~ ✅ 해소 (2026-10-06)

~~A8 `MedicalReceiptSourceRepository` 이관 블로커~~ → 2026-10-06 raw-columns 재조사에서 **IPLUS 쌍 모델 4개 전부 적재 확인**:
- `raw_emr_paosunab` (1.7M행·2002~2026 · 구 외래)
- `raw_emr_paosunab_new` (50K행·2017-07~2026 · 신 외래)
- `raw_emr_paisunab` (9.6K행·2006~2026 · 구 입원)
- `raw_emr_paisunab_new` (551행·2024-06~2026 · 신 입원)

+ 지원 테이블 8개(nhicm4ap·paytrans·picroom·picuserm·pmcptnt·pmootpth·receiptcash·setkind) 전부 raw 커버. 당일 A8 이관 완료 (`67ef3a9`).

### 6.3 `dm.dm_dashboard_*` 마트 활용 여부 (검토 부탁)

데이터 플랫폼 팀이 이미 만든 dashboard 전용 마트가 존재. 우리가 배치로 만드는 마트와 이름·의미가 매칭되는지 확인되면 우리 배치를 제거하고 dm 직독 가능 (스코프 대폭 축소). 상세: `docs/data-platform/migration-strategy.md` §10.3.

---

## 7. 긴급 — `cust_num` TRIM 표현식 인덱스 (2026-10-13 추가)

### 7.1 배경

로컬 수치 대조 중 발견. **raw 테이블의 `cust_num` varchar 길이가 서로 다름**:

| 길이 | 테이블 |
|---|---|
| **13** | custom · exam · cataract_exam · operationdata · cataract_operationdata · reservation · reserve_history · costprice · lens · re_operation · custom_gender |
| **20** | custom_history · happytalk_mapping |
| **23** | motive_new01 · motive_new02 |
| **50** | pentacam_data · pentacam_topo |
| **200** | casiadata |

CRM 원본에서 `CUST_NUM char(N)` 로 선언됐고, 데이터 플랫폼이 `varchar(N)` 로 적재하면서 **공백 패딩이 그대로 남아 저장 길이가 각 테이블의 선언 길이와 동일**. Postgres `varchar` 비교는 trailing space 가 유의미해서 길이 다른 두 테이블 JOIN 은 전부 매칭 실패.

### 7.2 발견 증상 (지표 왜곡)

- **월간 레포트 "일반 고객 검사 (소개 제외)"** — 로컬이 운영의 **1.7배로 과대 집계**.
  원인: `ExamList` 적재 SQL 의 `motive_new02(23) JOIN exam(13)` 가 매칭 실패 → `motive_l` 가 빈 값으로 적재됨 → `v_all_exam_list.intro_type` CASE 가 `ELSE '일반'` 로 빈 값 전부 "일반" 으로 쓸어담음.
  2026-06 분포: motive_l 비어있음 **1024/1075 (95%)**.
- MSSQL 운영 환경에서는 `char(N)` 끼리 padding-insensitive 비교라 매칭 OK → 운영은 정상이던 문제가 Postgres 포팅에서 드러남.

### 7.3 임시 패치 (대시보드 쪽 · 2026-10-13 적용)

- `sql/warehouse/exam/select-exam-list.sql` — motive JOIN 에 `TRIM(m2.cust_num) = TRIM(e.cust_num)` 적용
- `sql/warehouse/exam/select-cataract-exam-list.sql` — 동일
- `sql/warehouse/consultation/select-o-reservation-summary-by-charts.sql` · `select-op-summary-by-charts.sql` — `WHERE TRIM(r.cust_num) IN (:chartNos)` 로 통일

→ 수치 대조 돌리면 다른 리포에서도 추가 발견 예상. 발견 시마다 동일 패턴으로 패치 중.

### 7.4 요청 — raw `cust_num` 전수 표현식 인덱스

데이터 플랫폼 쪽은 **인덱스 추가만 가능**(스키마·데이터 변경 불가) 제약 하에 TRIM 비교를 index scan 으로 만들려면 각 raw 테이블 `cust_num` 에 다음 형태의 표현식 인덱스 필요:

```sql
-- 길이 13 그룹 (양쪽 JOIN 모두 TRIM 걸릴 수 있으므로 전부 요청)
CREATE INDEX IF NOT EXISTS idx_raw_crm_custom_cust_num_trim                   ON raw.raw_crm_custom                   ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_exam_cust_num_trim                     ON raw.raw_crm_exam                     ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_cataract_exam_cust_num_trim            ON raw.raw_crm_cataract_exam            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_operationdata_cust_num_trim            ON raw.raw_crm_operationdata            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_cataract_operationdata_cust_num_trim   ON raw.raw_crm_cataract_operationdata   ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_reservation_cust_num_trim              ON raw.raw_crm_reservation              ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_reserve_history_cust_num_trim          ON raw.raw_crm_reserve_history          ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_costprice_cust_num_trim                ON raw.raw_crm_costprice                ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_lens_cust_num_trim                     ON raw.raw_crm_lens                     ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_re_operation_cust_num_trim             ON raw.raw_crm_re_operation             ((TRIM(cust_num)));

-- 길이 20·23·50·200 그룹 — 다른 길이 테이블과 JOIN 필수
CREATE INDEX IF NOT EXISTS idx_raw_crm_custom_history_cust_num_trim           ON raw.raw_crm_custom_history           ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_happytalk_mapping_cust_num_trim        ON raw.raw_crm_happytalk_mapping        ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_motive_new01_cust_num_trim             ON raw.raw_crm_motive_new01             ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_motive_new02_cust_num_trim             ON raw.raw_crm_motive_new02             ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_pentacam_data_cust_num_trim            ON raw.raw_crm_pentacam_data            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_pentacam_topo_cust_num_trim            ON raw.raw_crm_pentacam_topo            ((TRIM(cust_num)));
CREATE INDEX IF NOT EXISTS idx_raw_crm_casiadata_cust_num_trim                ON raw.raw_crm_casiadata                ((TRIM(cust_num)));
```

**조건** — JOIN 양쪽 모두 TRIM 걸어야 각 테이블의 표현식 인덱스로 index scan. 쿼리 쪽은 "TRIM 통일" 로 전수 수정 중.

### 7.5 (근본 해결 제안 — 가능하면)

인덱스 추가만 가능하다면 위 표현식 인덱스로 해결 가능하지만, **raw 적재 시 varchar `cust_num` RTRIM** 처리가 가능해지면 우리 쪽 모든 TRIM 코드를 제거할 수 있어 훨씬 깔끔하다. 변경 가능 여부 확인 요청.

### 7.6 검증 방법

반영 후 로컬에서 재배치 → `mart_overall_exam_monthly.intro_general` 값이 운영과 일치하는지 비교.
현재 (TRIM 임시 패치만 적용, 인덱스 없음) 로컬 2026-06~10:
```
intro_general: 1042 · 1185 · 1097 · 928 · 391  (운영: 599 · 671 · 662 · 526 · 238)
```

인덱스 반영 + 재배치 후 로컬 수치가 운영과 ±5% 이내로 좁혀지면 성공.

---

## 문의

- 이관 정본: `docs/data-platform/migration-strategy.md`
- 컬럼 dump: `docs/data-platform/raw-columns.txt` (**55 테이블 × 2064 컬럼** · 2026-10-08 재dump)
- 실 배치 검증 로그: `migration-strategy.md` §9 이관 이력
