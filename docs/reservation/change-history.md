# 예약 변경이력 (reservation-change) — 정본

> 작성일: 2026-09-11 · 대상 커밋: `360d882` (2026-09-04 브랜치 머지 + 후속 정비)
> 관련 파일: `reservation/service/ReservationChangeChainBuilder.java` · `batch/job/ReservationChangeMartJob.java` · `sql/mart/reservation/*change*.sql` · `sql/softcrm/reservation/history/*.sql`
> 컬럼 상세: [`../db/mart-inventory.md`](../db/mart-inventory.md) §3 · UI 컴포넌트: `pages/reservation/reservation-change/`

## 1. 왜 이 문서가 필요한가

예약 변경이력은 배치 범위 의미·등록일 3순위·change_chain 문자열·시각 파싱 fallback·`change_count=0` 이 마트에 남는 이유 등 **암묵적 규칙이 많다**. 코드·SQL 주석에 흩어져 있어 신규 유지보수 시 놓치기 쉽다. 이 문서 하나로 결정 지점을 통합한다.

## 2. 큰 그림

```
[MSSQL SOFTCRM · 실시간]                [Postgres 마트]                 [화면 React]
  RESERVE_HISTORY   ─(D-1 배치)─▶  list_reservation_change  ─(실시간)─▶  변경 상세 탭
  RESERVATION                          (V63 · reserve_num PK)              추이 달력 탭
```

- **화면은 마트만 읽는다** — MSSQL 직결은 배치 잡 시점에만 (CLAUDE.md 원칙 부합)
- **배치 범위 = "이력 저장 기간"** — 등록일이 아님. 등록 후 3개월 뒤 늦게 바뀐 예약도 D-1 배치가 자연 흡수.

## 3. 배치 범위 의미 — 함정 (가장 헷갈리는 지점)

`ReservationChangeMartJob.run(from, to)` 의 `from..to` 는 **`RESERVE_HISTORY.HISTORY_TIME`** 기준.

| 잡 성격 | 범위 | 의미 |
|---|---|---|
| 매일 D-1 (`runDaily`) | 어제 하루 | 어제 이력이 저장된 예약 전부 → 이력 전체 재조회 → 체인 재계산 → upsert |
| 월 소급 (`runMonthlyReconcile`) | 전월 전체 | 그 달 손댄 예약 전부 재계산 |
| 초기 백필 (관리자 수동) | 월 단위로 나눠 | 2022-01~ 부터 순차. MSSQL 조회 시간 통제. |

**왜 등록일 아닌 이력 저장 기간?**
- 등록 1월 · 변경 3월 시나리오: 등록일 범위로 3월 배치를 돌리면 1월 예약을 못 잡음 → 3월 변경이 마트에 반영 안 됨
- 이력 저장 기간으로 잡으면 3월 배치가 "3월에 이력이 저장된 예약" 을 잡고 그 예약의 이력 전체 재조회 → 1월 등록 + 3월 변경 모두 반영

**UPSERT 필수** — 등록일 범위 delete+insert 는 안 됨. 같은 `reserve_num` 이 여러 배치에 걸쳐 갱신되므로 `ON CONFLICT DO UPDATE` 로 change_count·chain·final_date 덮어씀.

## 4. 등록일 3순위 (`reg_source`)

`ReservationChangeChainBuilder.registration(source)` 이 아래 순서로 시도, 하나 잡히면 확정.

| 우선 | 소스 | 값 | reg_source |
|---|---|---|---|
| 1 | RESERVE_HISTORY 첫 저장 시각 (H) | HISTORY_TIME → 실패 시 HISTORY_NUM 앞 12자리 | `H` |
| 2 | RESERVATION.InsertedDateTime (I) | 등록시각 원문 파싱 | `I` |
| 3 | 예약번호 앞 6자리 YYMMDD (N) | 채번일 (시각은 빈 값) | `N` |

`registered_time = ''` (빈 문자열) 이면 N 출처 (시각 미상).

## 5. HISTORY_TIME 파싱 — 7가지 포맷 + fallback

`RESERVE_HISTORY.HISTORY_TIME` 은 varchar 라 형식이 섞여 있음 (2026-09 실측: 절반 이상이 표준 형식 아님).

### 시도 순서 (`ReservationChangeChainBuilder.parseTime`)

| 순번 | 포맷 | 예시 | 비고 |
|---|---|---|---|
| 1 | `yyyy-MM-dd HH:mm:ss.SSS` | `2026-09-11 14:32:15.123` | datetime2 |
| 2 | `yyyy-MM-dd HH:mm:ss` | `2026-09-11 14:32:15` | datetime |
| 3 | `yyyy-MM-dd HH:mm` | `2026-09-11 14:32` | 초 생략 |
| 4 | `yyyy-MM-dd'T'HH:mm:ss` | `2026-09-11T14:32:15` | ISO |
| 5 | `yyyyMMddHHmmss` | `20260911143215` | 압축 |
| 6 | `yyyyMMddHHmm` | `202609111432` | 압축·초 생략 |
| 7 | `MM ppd yyyy pph:mma` (영문·공백 패딩) | `09  4 2026  1:58PM` | **MSSQL CONVERT style 100** — 의사랑 연동(imedic) 이 씀. 실측 한 주 451건 중 277행 |

### Fallback — HISTORY_NUM

HISTORY_TIME 을 못 읽으면 `HISTORY_NUM` 앞 12자리(`yyMMddHHmmss` — 채번 시각) 사용.

### 관측 3단계 카운터

`ReservationChangeMartJob.run()` 이 카운트:
- `totalSteps` — 시각 판정 시도 총 스텝 (분모)
- `historyTimeFail` — HISTORY_TIME 파싱 실패 (fallback 여부 무관)
- `recovered` — 그 중 HISTORY_NUM 시각으로 복구된 건수
- `timeLost` — 둘 다 실패 → 시각 미상으로 화면 노출

### 5% 임계치 (2026-09-11 도입)

`timeLost / totalSteps > 5%` 이면 `log.error` → Slack 알림 (LOGGING_SLACK_LEVEL=ERROR)
- 개별 timeLost 발생은 정상 (varchar 특성). 5% 초과 시에만 원본 형식 재조사 필요.
- 통계 3종은 `batch_run_log.table_stats` 에도 기록 → `/admin/batch` 화면에서 관측.

## 6. change_chain 문자열 규격

체인 접기 규칙: **이력을 저장 순서대로 훑으며 예약일이 직전과 달라질 때만 스텝 추가.**

### 형식

```
YYYY-MM-DD HH:MM@YYYY-MM-DD | YYYY-MM-DD HH:MM@YYYY-MM-DD | ...
```

- 왼쪽: 변경 시각 (yyyy-MM-dd HH:mm)
- 오른쪽: 그때의 예약일 (YYYY-MM-DD)
- 구분자: ` | ` (파이프)
- 시각 미상: `@YYYY-MM-DD` (왼쪽 공란)

### 예시

**변경 2회** (A → B → A · 왕복도 2회로 카운트):
```
2026-09-01 09:00@2026-09-15 | 2026-09-05 14:00@2026-09-20 | 2026-09-10 10:00@2026-09-15
```
- `change_count = 3 - 1 = 2`

**미변경** (스텝 1개):
```
2026-09-01 09:00@2026-09-15
```
- `change_count = 0` (달력 분모 · **상세 화면에는 노출 X**)

**시각 미상**:
```
@2026-09-15 | 2026-09-05 14:00@2026-09-20
```

### 화면 렌더

프론트가 `|` 로 split → `@` 로 split → 변경1·변경2·… 칸 생성. `changeColumnCount(views)` 가 표의 최대 변경 열 수 산정.

## 7. change_count=0 이 마트에 남는 이유

**"등록만 되고 예약일이 바뀐 적 없는 예약" 도 마트에 저장**. 왜?
- 추이 달력의 **등록 건수·변경률 분모**로 필요
- 조회 SQL 이 필요에 따라 필터:
  - `select-list-reservation-change.sql`: `WHERE change_count >= 1` (변경 상세 화면)
  - `select-list-reservation-change-daily-*.sql`: 필터 없음 (달력 집계)

이 규칙이 무너지면 변경률 = `changed / total` 의 분모가 실제보다 작아짐 → 변경률 과대 계산.

## 8. 두 daily SQL 축 차이

| SQL | 축 | 의미 |
|---|---|---|
| `select-list-reservation-change-daily-registered.sql` | `registered_at` (등록일) | 그 날 등록된 검사예약 수 · 그중 변경된 몫 |
| `select-list-reservation-change-daily-reserve-date.sql` | `final_date` (최종 예약일) | 그 날로 잡혀 있는 예약(미래 달 포함) · 그중 변경된 몫 |

같은 예약이 두 축에서 다른 날 버킷에 들어감. 화면 [기준] 세그먼트로 축 전환.

**미래 달 조회 가능** — final_date 축은 아직 오지 않은 예약일도 표시 (기획서 §6 "미래 예약까지 표시").

## 9. 조작·조회 흐름 (5가지)

| 조작 | 트리거 | 결과 |
|---|---|---|
| 배치 (D-1) | 매일 03:00 `BatchOrchestrator.runDaily` | 어제 이력 있는 예약 재계산 · upsert |
| 배치 (월 소급) | 매월 1일 03:30 `runMonthlyReconcile` | 전월 이력 있는 예약 전부 재계산 |
| 배치 (수동 백필) | 관리자 API · 월 단위로 나눠 | 초기 2022~ 로드 |
| 조회 (상세) | `GET /api/reservation-change?from&to` | 등록일 범위 · change_count ≥ 1 만 · MEDICAL·ALL 부서 개방 |
| 조회 (달력) | `GET /api/reservation-change/daily?from&to` | 일별 등록·변경 · 축 선택은 프론트 · 최대 366일 |

**MSSQL 접근** 은 배치 트리거뿐. 화면 조회는 마트만.

## 10. 권한

`docs/auth/permissions.md` § 4-1·4-2:
- 페이지 `reservation-change` — **MEDICAL 전용** (MARKETING · OVERSEAS_MARKETING 는 접근 X)
- API `/api/reservation-change/**` — `DEPT_MEDICAL` · `DEPT_ALL`
- 관리자 배치 재실행은 ADMIN 만

## 10-A. 감사·관측용 컬럼 정책 (2026-09-11)

`list_reservation_change` 에는 화면·API 에 노출하지 않는 관측 전용 컬럼 3종이 있음.

| 컬럼 | 저장 규칙 | 노출 |
|---|---|---|
| `last_changed_at` (VARCHAR(20)) | Writer 가 매번 채움 (마지막 변경 시각 · `change_chain` 의 마지막 스텝 시각과 동일) | ❌ SELECT SQL 에서 제외 · DTO 에도 없음. 관측·정렬 용도(향후 디버깅 SQL 에서 참조). |
| `first_loaded_at` (TIMESTAMP) | **최초 INSERT 시점 보존.** ON CONFLICT DO UPDATE 에서 의도적으로 SET 절에 없어 원본 유지 | ❌ 감사·디버깅용 (예: "2023년 예약이 언제 마트에 백필됐지?") |
| `loaded_at` (TIMESTAMP) | UPSERT 마다 `CURRENT_TIMESTAMP` 로 갱신 (최종 재적재 시점) | ❌ 관측용 · 기존 코드에도 있었음 |

**추적성 시나리오**:
- "2022년 예약이 처음 마트에 언제 들어왔나?" → `first_loaded_at`
- "이 예약이 마지막으로 언제 재적재됐나?" → `loaded_at`
- 두 값의 차이 = 늦은 변경이 몇 번 흡수됐는지 간접 지표

**기존 V63 DB 호환**: `V63__list_reservation_change.sql` 이 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS first_loaded_at` + `UPDATE ... SET first_loaded_at = loaded_at WHERE first_loaded_at IS NULL` 소급 처리 후 `NOT NULL` 승격. 기존 행의 `first_loaded_at` 은 마지막 `loaded_at` 으로 근사 (정확값 없음 · 감사 용도로 충분).

## 11. 함정 (Gotchas) — 유지보수 시 반드시 확인

1. **배치 범위 = 이력 저장 기간, 등록일 아님** — 이 이해 없이 range 를 좁게 잡으면 늦은 변경이 누락됨.
2. **change_count=0 은 항상 마트에 저장** — Writer 는 무조건 저장, 조회 SQL 이 필터로 걸러냄. 저장 스코프에서 빼지 말 것 (달력 분모 필요).
3. **UPSERT 필수** — 등록일 범위 delete+insert 는 늦은 변경 유실. `ON CONFLICT (reserve_num) DO UPDATE`.
4. **HISTORY_TIME 실패는 정상 · timeLost 5% 초과가 이상** — 개별 로그만 보고 놀라지 말 것. 임계치 초과 로그·Slack 만 대응.
5. **daily 두 SQL 축 차이** — `registered_at` (등록일) vs `final_date` (최종 예약일). 같은 값 나오면 배치·SQL 이 어긋난 것.
6. **change_chain 문자열은 파이프·앳 이스케이프 없음** — 예약일·시각에 이 문자 들어갈 일 없어 안전. 만약 새 필드 추가 시 이스케이프 필요.
7. **`reg_source='N'` 은 시각 미상 · registered_time=''** — 화면에서 시각 필터 하지 말 것.
8. **범위 상한 3660일** — 명단은 change_count ≥ 1 필터라 2022~ 전체도 3만 행 내라 넉넉히 열어뒀음. 오히려 넓은 범위 실수 방지가 목적.

## 12. 개선 여지 (별도 티켓)

- **timeLost 임계치 조정** — 5% 는 초기 값. 몇 달 관측 후 노이즈·유의미 경계 재조정.
- **매칭 판정 통합** — 시각 파싱이 자바에 몰림. SQL 에서 `TRY_CONVERT` 로 1차 필터 옵션 검토 (단 MSSQL 2014 미지원).
- **HISTORY_NUM 시각 검증 강화** — 앞 12자리 형식 이외 케이스 실측 시 fallback 확장.

### 12-A. `final_date VARCHAR(20)` vs DATE — 유지 결정 (2026-09-11)

**의사결정**: 현행 `VARCHAR(20)` 유지. DATE 로 마이그레이션 하지 않는다.

- **이론적 이득**: DATE 인덱스가 문자열 인덱스보다 range scan 이 약간 빠름.
- **실제 비용이 큼**:
  1. 스키마 변경 (`ALTER TABLE ... ALTER COLUMN final_date TYPE DATE USING CAST(final_date AS DATE)`) 은 전 행 재작성 · 잠금 위험
  2. `change_chain` 문자열 규격이 `YYYY-MM-DD` 를 전제로 하므로 프론트 파서·CSV·모델 모두 문자열 기대. 데이터 타입만 바꿔도 SELECT 시 `TO_CHAR` 로 다시 문자열화 필요 → 이득 상쇄
  3. `first_date`·`last_changed_at` 도 같은 이유로 VARCHAR — 일관성 유지가 낫다
  4. 현재 데이터 규모(수만~수십만 행) 에서 성능 차이 무의미
- **조건**: 데이터가 100만 행 넘고 daily 집계 응답이 500ms 초과하면 재고. 그때는 별도 티켓 · 마이그레이션 전략 별도 수립.

### 12-B. Service 계층 직접 단위 테스트 — 유지 결정 (2026-09-11)

**의사결정**: `ReservationChangeMartQueryService` 단위 테스트 없이 현행 유지.

- **이유**: Service 가 Repository 위임만 하는 얇은 계층 (약 15줄). Mocked repository 로 return 값 pass-through 를 확인하는 것은 프로덕션 가치 낮음.
- **간접 커버 완비**:
  - Repository 자체는 `ReservationChangeMartWriterIT` 가 Testcontainers 로 검증
  - HTTP 계약은 `ReservationChangeControllerIntegrationTest` 가 검증
  - Service 는 두 IT 사이의 pass-through 역할만 함
- **조건**: Service 에 비즈니스 로직(집계·필터·변환) 이 추가되면 그 시점에 단위 테스트 신설.

## 13. 관련 파일

**백엔드**:
- `reservation/service/ReservationChangeChainBuilder.java` — 체인 접기·시각 파싱·등록일 3순위
- `reservation/service/ReservationChangeReader.java` · `ReservationChangeMartQueryService.java` — 조회 인터페이스
- `reservation/repository/ReservationChangeMartRepository.java` — 마트 조회
- `reservation/repository/ReservationChangeHistoryRepository.java` — MSSQL 원천 스트리밍
- `reservation/controller/ReservationChangeController.java` — HTTP 엔드포인트
- `batch/job/ReservationChangeMartJob.java` · `ReservationChangeMartWriter.java` — 배치

**SQL**:
- `sql/mart/reservation/tables/V63__list_reservation_change.sql`
- `sql/mart/reservation/select-list-reservation-change.sql`
- `sql/mart/reservation/select-list-reservation-change-daily-{registered,reserve-date}.sql`
- `sql/mart/reservation/upsert-list-reservation-change.sql`
- `sql/softcrm/reservation/history/select-reservation-change-history.sql`

**프론트**:
- `pages/reservation/ReservationChangePage.tsx` (컨테이너, 탭 전환만)
- `pages/reservation/reservation-change/` — `DetailTab` · `CalendarTab` · `FilterControls` · `ReservationChangeCalendar` · `ReservationChangeDetailTable` · `reservationChange{Model,CalendarModel,Csv}.ts`

**테스트**:
- 단위: `ReservationChangeChainBuilderTest` (7 케이스 · 체인 접기·왕복 변경·등록일 3순위·시각 파싱)
- 통합 (Postgres): `ReservationChangeMartWriterIT` (5 케이스 · Writer↔Repository roundtrip · UPSERT 덮어쓰기)
- HTTP: `ReservationChangeControllerIntegrationTest` (11 케이스 · 인증·부서 gate·validation)
- 프론트 vitest: `reservationChangeModel.test.ts` · `reservationChangeCalendarModel.test.ts`
