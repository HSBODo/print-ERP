# 해외마케팅 마트 테이블 카탈로그

> **DB**: Postgres 마트 (`martJdbcTemplate`) · **최종 갱신**: 2026-09-11 · **관련 마이그레이션**: V64·V65·V66
> **관련 문서**: [매칭 로직 정본](overseas-crm-matching.md) · [마트 인벤토리](../db/mart-inventory.md#10-해외마케팅-도메인-2026-09-09-이관)

## 1. `overseas_marketing_sheet`

해외 접수 원본 + CRM 매칭 결과 + 파생값 스냅샷을 한 행에 담는 통합 테이블. 시트 이관분(V64 이전 브랜치의 V58~V62 를 통합)과 화면 수기 입력이 공존.

### PK / 시퀀스

| 키 | 컬럼 | 타입 | 설명 |
|---|---|---|---|
| PK | `sheet_row_number` | INTEGER | 시트 행: Google Sheet 원본 행번호(수천 단위) · 수기: 시퀀스 `overseas_marketing_manual_seq` 발급(1,000,000+) — 대역 분리로 시트 재동기화 시 충돌 방지 |
| INDEX | `ix_overseas_marketing_sheet_inquiry_date` | | `inquiry_date` (기간 조회 성능) |
| INDEX | `ix_overseas_marketing_sheet_customer_no` | | `customer_no` (CRM 매칭 후 상세 병합 시) |

### 시트 원본 컬럼 (담당자 편집 가능)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| `inquiry_date` | VARCHAR(10) | Y | 문의일 `YYYY-MM-DD` (자유서식 → `YYYY-MM-DD` 로 정규화) |
| `name` | VARCHAR(100) | N | 성명 (미입력이지만 연락처·이메일 있으면 `"(미입력)"` 로 대체) |
| `contact` | VARCHAR(100) | Y | 연락처 (자유서식 · 국내 `010-…` · 해외 `(+82)` 접두) |
| `email` | VARCHAR(300) | Y | 이메일 |
| `gender` | VARCHAR(20) | Y | |
| `dob` | VARCHAR(30) | Y | 생년월일 (자유서식 · CRM 매칭 시 스왑 허용) |
| `nationality` | VARCHAR(100) | Y | 국적 (`"배트남"` → `"베트남"` 자동 교정) |
| `ethnicity` | VARCHAR(100) | Y | 민족 |
| `occupation` | VARCHAR(200) | Y | 직업 |
| `contact_lens` | VARCHAR(100) | Y | 콘택트렌즈 착용 여부 |
| `medical_conditions` | TEXT | Y | 병력 |
| `medication_allergy` | TEXT | Y | 복용약·알레르기 |
| `departure_schedule` | VARCHAR(200) | Y | 출국 예정 |
| `exam_date` | VARCHAR(200) | Y | 검사일 (자유서식 · `YYYY-MM-DD` 있으면 매칭·자동 승격에 사용) |
| `surgery_date` | VARCHAR(200) | Y | 수술일 (동상) |
| `surgery_cost` | VARCHAR(100) | Y | 수술비 (자유서식) |
| `channel` | VARCHAR(100) | Y | 유입경로 |
| `online_channel` | VARCHAR(100) | Y | 온라인 채널 세부 |
| `remark` | TEXT | Y | 비고 |

### 감사·잠금 컬럼

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| `synced_at` | TIMESTAMP | N | 최초 반영 시각 (기본 `CURRENT_TIMESTAMP`) |
| `origin` | VARCHAR(10) | N | `'sheet'` (Google Sheet 이관) · `'manual'` (화면 수기 추가) |
| `created_by` | VARCHAR(100) | Y | 자동: `'GoogleSheet_Sync'` · 수동: 사용자 로그인 ID |
| `updated_by` | VARCHAR(100) | Y | 최종 수정자 로그인 ID (수정 후 조회 SQL 은 이 값 우선) |
| `updated_at` | TIMESTAMP | Y | 최종 수정 시각 |
| `locked_at` | TIMESTAMP | Y | **삭제 잠금 시각.** `origin='sheet'` 는 항상 잠김. `origin='manual'` 도 sync 잡 통과 후 잠김. NULL 인 manual 행만 DELETE 허용 (`RowLockedException` 방어) |

### 매칭 결과 컬럼 (CrmEnricher·confirmMatch 가 씀)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| `customer_no` | VARCHAR(20) | Y | 확정 CRM 고객번호 (SOFTCRM `CUSTOM.CUST_NUM`). 값 있으면 `matchStatus='matched'` |
| `matched_at` | TIMESTAMP | Y | 매칭 확정 시각 |
| `matched_by` | VARCHAR(100) | Y | 자동: `'CRM_Sync'` · 수동: 사용자 로그인 ID. **수기 편집 시 자동 매칭은 무효화되지만 수동 매칭은 이 값으로 판정해 보존** |
| `candidate_customer_no` | VARCHAR(20) | Y | 자동 매칭 실패 시 유일 후보 (담당자 팝업 확정 대상). 값 있으면 `matchStatus='review'` |
| `candidate_reason` | VARCHAR(300) | Y | 후보 근거 문구 (예: `"전화번호 일치 · 생일 불일치(시트 1990-08-15 / CRM 1970-01-01)"`) |

### CRM 파생값 스냅샷 (조회 시 MSSQL 재조회 대체)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| `crm_snapshot` | TEXT | Y | JSON 문자열. 매칭 시점의 CRM 파생값 19필드를 얼려서 저장 → 조회는 이걸 파싱해 화면 렌더 (MSSQL 접근 X). 스키마는 아래 §"crm_snapshot JSON 스키마" 참고 |
| `crm_refreshed_at` | TIMESTAMP | Y | 스냅샷 갱신 시각. **⚠️ 만료 정책 미구현** — 매칭 후 CRM 데이터가 바뀌어도 재조회 트리거 없음 (별도 티켓) |

### crm_snapshot JSON 스키마 (19필드)

`OverseasMarketingService.SNAPSHOT_KEYS`. 모든 필드 문자열, 없으면 `""` 로 저장(null 아님).

```json
{
  "status": "수술완료",              // CRM 파생 상태
  "registeredDate": "2026-07-11",    // CRM 등록일
  "examDate": "2026-08-01",          // 시트값 있으면 시트 우선 (applySnapshot 예외)
  "surgeryDate": "2026-08-05",       // 상동
  "operationRight": "SMILE",
  "operationLeft": "SMILE",
  "dreamlens": "",
  "examCost": "180000",
  "surgeryCost": "2400000",
  "costSource": "PriceItm",          // PriceItm | Fallback | ""
  "outpatient1Date": "2026-08-06", "outpatient1": "1일차 검진", "outpatient1Cost": "0",
  "outpatient2Date": "...",         "outpatient2": "...",       "outpatient2Cost": "...",
  "outpatient3Date": "...",         "outpatient3": "...",       "outpatient3Cost": "..."
}
```

### 조회 시 파생되는 값 (컬럼 아님, `receptions.sql` SELECT 파생)

| 파생 | 규칙 |
|---|---|
| `matchStatus` | `customer_no NOT NULL` → `matched` · `candidate_customer_no NOT NULL` → `review` · `exam_date` 가 `YYYY-MM-DD` 형태 (매칭 X) → `review` (자동 승격) · 그 외 → `received` |
| `locked` | `origin='sheet' OR locked_at IS NOT NULL` |
| `modifiedBy`·`createdBy` | 시스템 값(`GoogleSheet_Sync`·`CSV_Load`) 이면 `'admin'` 로 축약 표시 |

### 함정 (Gotchas)

1. **PK 대역**: 시트 재동기화 시 신규 시트 행이 기존 수기 행과 겹치지 않게 시퀀스 시작을 1,000,000 로 둠. 시트가 그 이하로만 자라는 걸 전제로 함.
2. **origin='sheet' 는 항상 삭제 잠금**: 담당자가 실수로 이력을 지우지 못하게 함. 수정은 가능. `updateRow` 는 자동 매칭 결과만 무효화하고 수동 매칭·감사 컬럼은 보존.
3. **crm_snapshot 무효화 조건**: `updateRow` (자동 매칭 행만) + 명시적 `clearCrmSnapshots()` 관리 SQL. **매칭 확정 후 CRM 변경분은 반영되지 않음** — [`overseas-crm-matching.md` §7-2](overseas-crm-matching.md#7-함정-gotchas--유지보수-시-반드시-확인) 참조.
4. **자동 승격 review**: `receptions.sql:45-48` 이 저장된 후보 없이도 검사일이 있으면 review 로 표시. **DB 컬럼값과 화면 상태가 다를 수 있음** — 재동기화 후에도 계속 review 로 남는다.
5. **candidateReason 표시 지연**: 배치가 저장한 `candidate_reason` 은 표시되지만, 자동 승격된 review 는 화면 SQL 이 실시간 문구 생성 (`"검사일 기록 있음 · CRM 매칭 필요"`).

### 관련 SQL 파일

| 파일 | 용도 |
|---|---|
| `sql/mart/marketing/receptions.sql` | 화면 조회 (파생 `matchStatus`·`locked` 등 포함) |
| `sql/mart/marketing/manual-insert.sql` | 수기 행 추가 (시퀀스 발급) |
| `sql/mart/marketing/sync-insert.sql` | 시트 동기화 INSERT (ON CONFLICT DO NOTHING) |
| `sql/mart/marketing/row-update.sql` | 수정 (자동 매칭 무효화·수동 매칭 보존) |
| Repository 인라인 | matches·candidates·snapshots UPDATE · locked_at 세팅 · DELETE (manual+unlocked만) |

---

## 2. `overseas_reservation_stats`

해외마케팅 예약통계 셀 값. `(date × group × metric)` 3튜플이 키. 3중 소스 병합.

### PK

| 키 | 컬럼 | 타입 | 설명 |
|---|---|---|---|
| PK | `(stat_date, group_key, metric_key)` | DATE + VARCHAR + VARCHAR | 복합 키. 같은 셀은 최대 1행 (UPSERT) |

### 컬럼

| 컬럼 | 타입 | NULL | 설명 | 허용 값 |
|---|---|---|---|---|
| `stat_date` | DATE | N | 날짜 (일 단위 저장. 조회 시 월/주로 롤업) | |
| `group_key` | VARCHAR(20) | N | 국가·에이전시 그룹 | `total` · `anglo` · `china` · `vietnam` · `mongolia` · `agency` |
| `metric_key` | VARCHAR(40) | N | 지표 종류 | `inq` (문의) · `rsv` (예약) · `exam` (검사) · `surgery` (수술) · `outpatient` (외래) · `<channel>_inq` · `<channel>_rsv` (채널 세분) |
| `value` | INTEGER | N | 값 (기본 0) | |
| `source` | VARCHAR(10) | N | 값 출처 | `seed` (2026-08-23 이전 시트 시드) · `manual` (담당자 수기 수정, 우선) |
| `updated_by` | VARCHAR(100) | Y | 수기 수정자 로그인 ID | |
| `updated_at` | TIMESTAMP | Y | 수기 수정 시각 | |

### 조회 시 3중 소스 병합 (`OverseasReservationStatsService.getStats`)

| 우선순위 | 소스 | 대상 기간 |
|---|---|---|
| 1 (최고) | `source='manual'` 저장값 | 담당자 수정한 셀만 |
| 2 | 접수리스트 자동 집계 | 2026-08-24 ~ (해당 기간의 접수 행에서 실시간 계산) |
| 3 (기본) | `source='seed'` V66 시드 | ~ 2026-08-23 |

**정책**: manual 있으면 그 값이 절대 우선. 자동 집계는 seed 를 덮되 manual 은 덮지 않음.

### 관련 SQL 파일

| 파일 | 용도 |
|---|---|
| `sql/mart/marketing/reservation-stats-select.sql` | 저장값 조회 (seed + manual) |
| `sql/mart/marketing/reservation-stats-upsert.sql` | 셀 수기 수정 (source='manual' 로 강제) |
| `sql/mart/marketing/reservation-stats-source.sql` | 자동 집계 원천 (접수리스트 전체) |
| `sql/mart/marketing/seeds/V66__overseas_reservation_stats_seed.sql` | ~2026-08-23 시드 데이터 |

### 함정 (Gotchas)

1. **manual 은 자동 집계보다 우선**: 담당자가 수정한 값은 이후 접수리스트가 바뀌어도 그대로. 되돌리려면 명시적으로 다시 저장하거나 DB에서 `source='manual'` 행 삭제.
2. **group_key·metric_key 는 코드 컨벤션**: DB 스키마에 CHECK 없음. 프론트·백엔드 코드 상수와 어긋나면 조회 SQL 이 매칭 못 함 → 화면 공란.
3. **자동 집계는 2026-08-24 컷오프**: 그 이전은 시드값만 신뢰. 접수리스트에서 소급 집계하지 않음(시트 이관 이전 데이터 부재).

---

## 3. 시퀀스

| 이름 | 시작값 | 용도 |
|---|---|---|
| `overseas_marketing_manual_seq` | 1,000,000 | 수기 행(`origin='manual'`) 의 `sheet_row_number` 발급. 시트 원본 행번호(수천 단위) 대역과 분리해 재동기화 시 충돌 방지 |

## 관련 문서

- [`overseas-crm-matching.md`](overseas-crm-matching.md) — 매칭 4단계·상태 판정·저장 규칙·조작별 흐름
- [`../db/mart-inventory.md`](../db/mart-inventory.md) — 전체 마트 인벤토리 (§10)
- [`../auth/permissions.md`](../auth/permissions.md) — 부서 gate·ADMIN 조작 정책 (§4-1·§4-2)
