# 해외마케팅 접수리스트 — CRM 매칭 로직

> 작성일: 2026-09-11 · 대상 커밋: 17a9785 (2026-09-04 브랜치 머지분)
> 관련 파일: `marketing/service/OverseasMarketingService.java` · `OverseasMarketingCrmEnricher.java` · `OverseasMarketingEditService.java` · `sql/mart/marketing/*.sql` · `sql/softcrm/marketing/*.sql`

## 1. 왜 이 문서가 필요한가

해외마케팅 접수 행을 CRM 고객(MSSQL SOFTCRM.CUSTOM)과 이어붙이는 규칙이 **SQL(`receptions.sql`)과 자바(`applySnapshot`·`CrmEnricher`) 양쪽에 나뉘어** 있다. 상태 판정·매칭 우선순위·저장 정책이 흩어져 있어, 이 문서 하나로 결정 지점을 통합해 둔다. 테스트 작성·리팩터·버그 대응 시 여기부터 본다.

## 2. 큰 그림

```
[Google Sheet]   ─(1회성 이관)─▶  overseas_marketing_sheet  ◀─(수기 입력)─  [담당자]
                                            │
                                            ▼
                                     [화면 조회 = 마트만]
                                            │
                        ┌───────────────────┼──────────────────┐
                        │                                      │
                (sync-crm 버튼 클릭)                  (수동 매칭 팝업)
                        │                                      │
                        ▼                                      ▼
                [백그라운드 잡]                          [단건 즉시 병합]
                        │                                      │
                        └────── MSSQL SOFTCRM (매칭·상세·비용) ─┘
                                            │
                                            ▼
                             customer_no·crm_snapshot 저장 → 이후 조회는 마트만
```

- **조회 경로는 마트만 읽는다** — MSSQL 직결은 sync-crm 잡과 수동 매칭 확정 때에만.
- **매칭 결과는 같은 테이블의 컬럼**에 영속화(`customer_no`·`candidate_customer_no`·`crm_snapshot`·`matched_by`·`matched_at`·`crm_refreshed_at`). 별도 매칭 테이블 없음.

## 3. 접수 행의 3가지 상태

`receptions.sql:50-53` 이 SELECT 시점에 파생한다.

| 상태 (`matchStatus`) | 판정 조건 | 의미 | UI 처리 |
|---|---|---|---|
| `matched` | `customer_no IS NOT NULL` | 확정 매칭 (자동 or 수동) | CRM 파생값(상태·수술·비용) 표시 |
| `review` | `candidate_customer_no IS NOT NULL` **또는** `exam_date` 가 `YYYY-MM-DD` 형태인데 매칭 X | 담당자 확인 필요 | 팝업으로 최종 확정 유도 |
| `received` | 그 외 (신규 접수) | 아직 매칭 시도 없음 or 매칭 실패 | 조회만 |

**핵심 함정** — `review` 는 두 경로가 있다:
- ① `CrmEnricher` 가 후보를 찾았지만 생일 불일치·정보 부족으로 확정 못한 경우 → `candidate_customer_no` + `candidate_reason` 저장
- ② 시트에 검사일이 실제 날짜로 적혀 있는데(내원 이력이 있는 셈) 매칭·후보 둘 다 없는 경우 → **컬럼 저장 없이 조회 시점에 자동 승격**, `candidateReason` = `"검사일 기록 있음 · CRM 매칭 필요"`

## 4. 자동 매칭 4단계 (`CrmEnricher.matchUnmatchedRows`)

`sync-crm` 잡이 미매칭 행에 대해 아래 순서로 시도한다. **하나 잡히면 나머지 단계는 건너뜀.**

| 단계 | 메서드 | 판정 규칙 | 확정 여부 |
|---|---|---|---|
| **1. 이름+생일 정확일치** | `uniqueNameDob` | 시트 `name` 정확 일치 + 생일 `equal` or `swapped`(월·일 뒤바뀜 허용) → **유일 후보만** | ✅ 확정 |
| **2. 당일 내원자 + 이름 or 생일 유일** | `uniqueEventDate` | 시트 `examDate`/`surgeryDate` 당일 CRM 내원자 중 이름(토큰 정렬로 성·이름 순서 뒤바뀜 허용) or 생일(스왑 허용) **유일 일치** | ✅ 확정 |
| **3. 전화 뒷8자리 or 이메일 유일 + 생일 검증** | `uniquePhone` → `uniqueEmail` | 유일 후보 + 생일 `equal`/`swapped` | ✅ 확정 |
| **4. 유일 후보인데 생일 X** | (같은 후보 대상) | 후보 자체는 유일하지만 생일 다르거나 없음 | ⚠️ `review` (candidate_customer_no 저장) |

### 단계별 왜 이런 규칙인가

- **1단계는 거의 실수 없음** — CRM 이름 오타·시트 오탈자만 없으면 100% 신뢰.
- **2단계가 실용의 핵심** — 날짜가 후보군을 좁혀 이름 표기 차이를 흡수. 실측 사례: 시트 `"Anujin Tsendsuren"` ↔ CRM `"TSENDSUREN ANUJIN"` (성·이름 순서 반대) + CRM 생일 연도 오타.
- **3단계는 최후의 시도** — 전화·이메일은 후보군을 넓게 만들어서, 생일로 재검증.
- **4단계는 사람에게 넘긴다** — 자동 확정 위험보다 담당자 판단이 안전.

### 생일 스왑 (`dobStatus`)

CRM에 `1990-08-15` 를 `1990-15-08` 로 뒤집어 넣은 사례가 실측됨. `s[1]==c[2] && s[2]==c[1]` 이면 `swapped` 로 취급해 동일인.

### 전화번호 국내/해외 분리

시트가 `(+82)` 접두 또는 `010`·`011`·`016~019` 로 시작하면 국내, 그 외는 해외. **국내끼리·해외끼리만 매칭.** 뒷 8자리 우연 겹침으로 인한 오매칭 방지.

### 이름 토큰 정렬 (`sortedNameTokens`)

대문자화 → 문자·숫자 외 경계로 split → 사전순 정렬 → 공백으로 재결합. `"홍 길동"` = `"길동 홍"` = `"홍, 길동"` = `"길동/홍"` 모두 같은 키.

## 5. 조작별 저장 규칙

### 5.1 sync-crm (자동 매칭 배치)

- **단일 실행 락** (`syncRunning.compareAndSet`) — 중복 클릭·새로고침으로 MSSQL 풀 3개가 겹치지 않게.
- **증분 처리** — `crm_snapshot` 이미 있는 행은 상세·비용 재조회 X (스냅샷 없음 = 병합 필요).
- **저장 트랜잭션**: `saveMatches`(자동 확정) + `saveCandidates`(확인필요) + `saveCrmSnapshots`(파생값 JSON).
- **matched_by = `'CRM_Sync'`** — 자동 매칭 표시.

### 5.2 수동 매칭 확정 (`confirmMatch`)

- 담당자가 팝업에서 CRM 고객번호를 지정 → 즉시 상세·비용·스냅샷 병합.
- **matched_by = 사용자 로그인 ID** — 이후 편집·재동기화에서 이 행의 매칭은 보존된다.

### 5.3 수기 행 편집 (`updateRow` / `row-update.sql`)

- 시트 원본 컬럼만 UPDATE. CRM 파생값(`customer_no`·`crm_snapshot` 등)은 조회 시 재계산 대상이라 SQL에서 명시적으로 무효화한다.
- **핵심 조건** (`row-update.sql:26-30`):
  ```sql
  customer_no = CASE WHEN COALESCE(matched_by, 'CRM_Sync') <> 'CRM_Sync'
                     THEN customer_no ELSE NULL END
  ```
  → **자동 매칭(`CRM_Sync`)만 무효화, 수동 매칭은 보존.**
- `candidate_customer_no`·`candidate_reason` 은 항상 무효화 (다음 sync에서 재판정).

### 5.4 삭제 (`deleteRow`)

- `origin='manual' AND locked_at IS NULL` 인 행만 허용.
- 그 외 (`origin='sheet'` 또는 동기화 흔적이 있는 manual 행) → `RowLockedException` (409).

### 5.5 Google Sheet 동기화 (`sync-insert.sql`, 기본 OFF)

- `ON CONFLICT (sheet_row_number) DO NOTHING` — 기존 시트 행 덮어쓰지 않음.
- 수기 행(`origin='manual'`, PK 1,000,000+)은 시트 PK 대역(수천 단위)과 겹치지 않아 안전.
- created_by = `'GoogleSheet_Sync'` · locked_at = synced_at 자동 세팅.

## 6. `crm_snapshot` JSON 스키마

`OverseasMarketingService.SNAPSHOT_KEYS` (19개 필드):

| 카테고리 | 필드 |
|---|---|
| CRM 상태 | `status`, `registeredDate` |
| 검사·수술 일자 | `examDate`, `surgeryDate` |
| 수술 정보 | `operationRight`, `operationLeft`, `dreamlens` |
| 비용 | `examCost`, `surgeryCost`, `costSource` |
| 외래 3회분 | `outpatient1Date`·`outpatient1`·`outpatient1Cost` (2/3도 동일) |

조회 시 `applySnapshot` 이 이 값들을 복원. **예외** — `examDate`·`surgeryDate` 는 시트 원본값이 비어 있을 때만 스냅샷으로 채움 (시트 우선).

## 7. 함정 (Gotchas) — 유지보수 시 반드시 확인

1. **매칭 판정이 SQL·자바 양쪽에 있음** — SELECT 시점의 `matchStatus` 파생(`receptions.sql:50-53`)과 배치의 확정 저장(`CrmEnricher`)이 규칙을 공유해야 한다. 한쪽만 바꾸면 어긋남.
2. **`crm_refreshed_at` 만료 정책 없음** — 매칭 확정 후 CRM 데이터(수술일·비용 등)가 바뀌어도 재조회 트리거 없음. 강제 재갱신은 담당자가 편집으로 `customer_no` 를 지워야 하는데 자동 매칭 행에 한함. 수동 매칭 행은 수단 없음.
3. **`origin='manual'` 도 동기화 후 잠긴다** — sync-crm 이 아니라 sync-sheet(시트 재동기화) 실행 시 `sync-insert.sql` 이 아니라 별도 로직으로 처리되므로 확인 필요. 현 코드에서는 sync-insert 는 시트 PK 대역만 건드림.
4. **이름 정규화 범위** — `sortedNameTokens` 는 유니코드 문자 기반이라 한글·영문·중문 모두 처리하지만 히라가나·가타카나·한자 조합 미검증. 실측 필요.
5. **자동 승격 `review`** — `receptions.sql:45-48` 에서 컬럼 저장 없이 표시만 승격되므로, 재동기화 후에도 상태가 계속 review 로 남는다. 담당자가 수동 매칭할 때까지 계속.
6. **`OverseasMarketingSyncer`(시트 → 마트)와 `OverseasMarketingCrmEnricher`(마트 → CRM 매칭) 는 별개 잡** — 이름이 비슷해 혼동 주의. 전자는 기본 OFF(`OVERSEAS_GOOGLE_SHEETS_SYNC_ENABLED=false`), 후자는 sync-crm 버튼.

## 8. 개선 여지 (별도 티켓)

- **매칭 규칙 단위 테스트** — 현 시점 백엔드 테스트 0건. `dobStatus`·`sortedNameTokens`·`uniqueNameDob`·`uniqueEventDate` 는 순수 함수라 테스트 쉬움.
- **`crm_refreshed_at` 활용** — 매칭 후 N일 경과 시 재갱신 배치, 또는 화면에서 "CRM 재조회" 버튼.
- **`review` 자동 승격을 컬럼에 반영** — 조회 시점 파생 대신 배치가 `candidate_reason` 을 채워두면 조회 SQL 이 단순해진다.
- **매칭 판정 통합** — 자바 `applySnapshot` + SQL `matchStatus` 파생 로직을 한 곳으로 모으면 유지보수 부담 감소.
