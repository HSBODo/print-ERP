# 문자 발송 관리(SMS) 자동화 전략

> 작성일: 2026-08-28 · 최신화: 2026-08-31
> 상태: **Phase 2 완료** — 자동 발송 배치(SmsDispatchJob) + 큐 테이블 도입. 기본 disabled 로 배포 안전.
> 목적: "화면 조회 = 자동 적재" 임시 경로를 정리하고, 오프셋·발송·결과 동기화를 **배치 + UI 편집 + DB 큐**로 옮기기 위한 설계·마이그레이션 계획

> 📌 관련 문서
> - 기획서(고객케어 TF v5): `docs/기획/sms.html`
> - 배치 전략 상위 규약: `docs/databatch/strategy.md`
> - 배치 실행 규칙(스케줄·마트별 write 정책): 위 §12

---

## 0. 현재 상태 (Phase 1 완료 · 2026-08-28)

### 실제 이행된 데이터 흐름

```
   03:00 SmsImportJob                                  관리자 조작 (즉시 반영)
        │                                                  │
        ▼                                                  ▼
  list_surgery (마트)                                오프셋·시각·종류 편집
        │                                                  │
        ▼ upsert                                           ▼ UI 그리드
   sms_target ─────────────────────────────────► sms_offset_config
        │                                                  ▲
        │ 관리자 화면 (SELECT-only 이제)                   │ 실시간 lookup
        ▼                                                  │
   화면 조회·홀딩·연락처 수정·수신거부 관리 ◄──────────────┘
        │
        │ 관리자가 [발송] 버튼 (수동, dry-run 상태)
        ▼
   SmsSendService ──► SolapiSendService ──► [DRY_RUN 스킵 or 실 발송]
        │
        ▼ 이력 기록
   sms_send_log
```

### Phase 1 완료 항목

**Phase 1A — 오프셋·시각·종류 UI 편집** (완료)
- V61 `sms_offset_config` — 그룹×차수 오프셋 + tier-level 시각(TIME) + 종류(NOTIFICATION/AD) 통합 스키마
- 백엔드: SmsOffsetConfig 엔티티/리포지토리/서비스 · GET/PUT `/api/sms-management/offsets`
- 프론트: SmsOffsetGrid — 문자 발송 리스트 상단 접힘 카드. 상단 시각·종류 3세트, 하단 4×3 오프셋
- SolapiProperties.offsetDays 를 DB 조회로 교체(fallback: SurgeryGroup 상수)
- 변경 즉시 반영 (캐시 refresh + targets 재조회)

**Phase 1B — Import 배치 승격 · 화면 SELECT-only** (완료)
- `SmsImportJob` 신설 — `BatchOrchestrator.Domain.SMS` 추가 (SURGERY 뒤 실행)
- 매일 03:00 데일리 + 매월 1일 03:30 재조정 자동 처리
- `SmsTargetService.findRowsAutoImport` 안의 자동 upsert 호출 제거 — 화면 조회 = SELECT-only
- 관리자 재실행 API `POST /api/admin/batch/rerun?domain=SMS` 자동 지원

**수신거부 관리 UI** (완료)
- 백엔드: `DELETE /api/sms-management/opt-outs/{id}` (기존 `?phone=` 도 유지)
- 프론트: SmsOptOutModal — 목록 조회 + 해제 (확인 다이얼로그 · 정책 안내)
- 정책: 물리 삭제(되돌릴 수 없음), 홀딩은 자동 해제 안 함(별도 액션)

**Solapi Dry-run 안전장치** (완료)
- `solapi.dry-run` 기본 true — 실 API 호출 없이 SUCCESS 반환. `messageType=DRY_RUN` 으로 이력에 남음
- 운영 배포 전에만 `SOLAPI_DRY_RUN=false` 로 명시 해제
- 3중 안전장치 (dry-run + API 키 미설정 시 503 + 문구 미설정 시 skip)

**엔티티 컬럼명 명시** (완료)
- SmsTarget · SmsSendLog · SmsOptOut · SmsOffsetConfig 전 컬럼에 `@Column(name=...)` 명시
- Hibernate 6 SnakeCase 전략이 `tier1Kind → tier1kind` 로 변환해 CREATE 컬럼과 어긋나던 문제 방지

### 남은 임시 구조 (Phase 3 로 해소)

1. ~~**자동 발송 없음**~~ — Phase 2 완료. `SMS_DISPATCH_ENABLED=true` 로 활성화 시 자동 발송
2. **발송 결과 자동 동기화 없음** — `POST /sync` 수동 호출 (Phase 3 예정)
3. ~~**재시도 이력 불투명**~~ — Phase 2 큐 표에 attempt_count·last_error·status 로 표현됨

---

## 0-1. Phase 2 완료 상태 (2026-08-31)

### 실제 이행된 데이터 흐름

```
   03:00 SmsImportJob         매 5분 SmsDispatchJob        관리자 조작
        │                            │                            │
        ▼                            ▼ FOR UPDATE SKIP LOCKED    ▼
   list_surgery                sms_dispatch_queue          오프셋·시각·종류·큐 재실행
        │                            │                            │
        ▼ upsert + 큐 3행 enqueue   ▼ 상태 PROCESSING→DONE/…    │
   sms_target ──────────────► sms_dispatch_queue ◄────── sms_offset_config
        │                            │                            ▲
        │                            │ SmsSendService              │ 편집 시 PENDING
        │                            ▼ (기존 안전장치 그대로)      │ 큐 재계산
        │                       [dry-run or 솔라피 API]            │
        │                            │                            │
        ▼                            ▼                            │
   화면 조회·홀딩·연락처 수정  ◄──── sms_send_log 이력            │
        (홀딩 시 큐 취소 · 해제 시 재등록 · 오프셋 편집 시 재계산)─┘
```

### Phase 2 완료 항목

**V62 `sms_dispatch_queue` 신설** — target×3차수 큐, status(PENDING/PROCESSING/DONE/FAILED/CANCELED)·kind·attempt_count, 부분 인덱스 3종.

**`SmsDispatchQueueService`** — 큐잉·폴링(SKIP LOCKED)·재계산·재시도·홀딩 취소/재등록.

**`SmsImportJob` 확장** — 대상 upsert 후 SENDABLE 만 큐 3행 INSERT (ON CONFLICT DO NOTHING). `sms_queue_enqueued` 카운트를 batch_run_log 에 남김.

**`SmsOffsetConfigService` 확장** — 편집 API 안에서 `SmsDispatchQueueService.recalculateScheduledForPending()` 동기 호출 (§9-2 결정 a). 미발송 큐만 새 시각·kind 로 재계산. 순환 참조는 ObjectProvider 로 해소.

**`SmsTargetService` 확장** — `changeStatus`/`changeStatusBulk` 안에서 HOLD → PENDING 큐 취소, SENDABLE → 재등록. 원자적.

**`SmsDispatchJob`** — 매 5분(`sms.dispatch.cron`) 폴러. dry-run·광고톡 시간대·일일 한도·최대 재시도(§9-1 결정: 3회·5분·백오프 없음) 안전장치. `sms.dispatch.enabled=false` 기본. `batch_run_log` + Slack 요약.

**Admin API `/api/admin/batch/sms/queue/*`** — status·rows·retry·run·statuses.

**프론트** — `SmsQueueStatusCard`(상단 접힘 카드, 30초 갱신) + `SmsFailedQueueModal`(FAILED/CANCELED 탭, 선택 재실행). `useSmsQueue.ts` 훅.

### Phase 2 착수 전 확정된 결정 (§9 ⏳ 항목)

1. **재시도 정책** — max-attempts=3, 5분 폴링 간격, 지수 백오프 없음. env 조정 가능
2. **오프셋 편집 시 큐 재계산** — 편집 API 안 **동기** 재계산 (같은 트랜잭션)
3. **문구·템플릿 준비** — 이관 시점에 준비 완료(2026-08-31 확인)
4. **큐 자동 정리** — 초기엔 (b) 그대로 유지 (감사 근거)

---

## 1. 목표 구조 (자동화 이후)

### 데이터 흐름

```
  03:00 SmsImportJob         매 5분 SmsDispatchJob       15:00 SmsResultSyncJob
       │                            │                            │
       ▼                            ▼ FOR UPDATE SKIP LOCKED     ▼
  list_surgery                sms_dispatch_queue            솔라피 조회 API
       │                            │                            │
       ▼ upsert 대상 + 큐 3행       ▼ 상태 PROCESSING→DONE      ▼
  sms_target ──────────────► sms_dispatch_queue ◄────────► sms_send_log
                                    │                     (delivered_at)
                                    │ SmsSendService
                                    ▼
                              [dry-run or 솔라피 API]
                                    │
                                    ▼
                              sms_send_log 이력
```

### 왜 큐 테이블인가

전략 문서 v1 은 "큐 없이 basis=SCHEDULED 로 sms_target 직접 조회" 방식이었으나, 다음 근거로 **DB 큐 테이블**로 재설계:

1. **재시도 정책이 명시적으로 표현** — `status=FAILED AND attempt_count<3` 같은 SQL 로 자연 표현. 사이클(schedule_base) 개념만으로는 실패 재시도가 안 자연스러움
2. **상태 가시성** — "발송 예정이지만 아직 안 됨" 을 표로 조회 가능. `sms_send_log` 로그로만 사후 판정하던 것 대비 명확
3. **Phase 3 연동 자연스러움** — 결과 동기화가 큐 상태 갱신으로 흐름이 하나로 이어짐
4. **감사·컴플라이언스** — 병원 도메인이라 "언제 왜 안 나갔는지" 표에 남는 게 필요
5. **동시 워커 대비** — `FOR UPDATE SKIP LOCKED` 로 향후 워커 늘려도 안전

**단점 상쇄**: 지금 규모(하루 수십명)에서 큐 표 폴링 부담 없음. 스키마·코드 복잡도는 표 하나 + 잡 하나 수준.

---

## 2. Phase 1A — 오프셋·시각·종류 UI 편집 ✅ 완료

### 실제 스코프

1. V61 `sms_offset_config` — 단일 CREATE + `ALTER ADD COLUMN IF NOT EXISTS` 3중 방어
   ```sql
   CREATE TABLE IF NOT EXISTS sms_offset_config (
       group_code   VARCHAR(20) PRIMARY KEY,
       tier1_offset INT NOT NULL DEFAULT 1,
       tier2_offset INT NOT NULL DEFAULT 7,
       tier3_offset INT NOT NULL DEFAULT 14,
       tier1_time   TIME NOT NULL DEFAULT '10:00',
       tier2_time   TIME NOT NULL DEFAULT '10:00',
       tier3_time   TIME NOT NULL DEFAULT '10:00',
       tier1_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       tier2_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       tier3_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       updated_by   VARCHAR(50), updated_at TIMESTAMP
   );
   INSERT INTO sms_offset_config (group_code, tier1_offset, tier2_offset, tier3_offset, ...)
   VALUES ('SMILE',1,7,14,...), ('LASIK',1,7,14,...), ('LASEK',5,7,14,...), ('ICL',3,7,14,...)
   ON CONFLICT (group_code) DO NOTHING;
   ```
2. `SmsOffsetConfig` 엔티티 · `SmsOffsetConfigRepository` (JPA) · `SmsOffsetConfigService` (캐시)
3. `SolapiProperties.offsetDays` → `SmsOffsetConfigService.offsetOf` 조회로 교체 (fallback: SurgeryGroup)
4. Admin API `GET/PUT /api/sms-management/offsets` (원자적 갱신)
5. 프론트 `SmsOffsetGrid.tsx` — 상단 시각·종류 편집, 하단 4×3 오프셋

### 유효성 규칙

- 오프셋: 각 정수 0..30, `tier1 ≤ tier2 ≤ tier3`
- 그룹: SMILE·LASIK·LASEK·ICL 4종만. ETC 로 오는 요청은 400
- 시각: HH:mm 필수 (분 단위 정밀도)
- 종류: `NOTIFICATION` / `AD` 만
- 광고톡 시간 제한: `AD` 종류일 때 hour ∈ [8, 20]. 알림톡은 제한 없음

### 즉시 반영

- 캐시 pub-sub 없이 편집 후 `refresh()` 즉시 호출 (Spring 서비스 안 ConcurrentHashMap)
- 프론트 mutation 성공 시 `sms.targets` 캐시 invalidate → 화면 재조회
- 이미 발송된 로그(`sms_send_log`) 는 그대로 (사이클 개념)

---

## 3. Phase 1B — Import 배치 승격 · 화면 SELECT-only ✅ 완료

### 실제 스코프

1. `SmsImportJob` (`postgres-mart` 프로파일)
   - `SmsTargetService.importFromSurgeryList` 를 잡으로 래핑
   - `BatchOrchestrator.Domain.SMS` 추가 (SURGERY 뒤 실행)
   - Slack 알림 통합 (`BatchSlackNotifier`)
2. `BatchOrchestrator` 통합
   - 데일리 03:00 + 월간 재조정 1일 03:30 자동 처리
   - 관리자 부분 실행: `POST /api/admin/batch/rerun?from&to&domain=SMS`
3. 화면 정리
   - `findRowsAutoImport` 안의 `importFromSurgeryList` 호출 삭제
   - `POST /targets/import` 는 백업 재실행용 유지
   - 조회 성능 개선 — 매 호출 upsert 200회 → 0회

### 안전장치

- `min-year=2026` — D-1 이 2025-12-31 이면 skip
- 트랜잭션 단위 all-or-nothing
- `batch_run_log.table_stats` 에 `sms_target_created/updated/skipped` 카운트

---

## 4. Phase 2 — 자동 발송 배치 (SmsDispatchJob) · **큐 테이블 방식**

### 스코프

**1. V62 `sms_dispatch_queue` 신설**
```sql
CREATE TABLE IF NOT EXISTS sms_dispatch_queue (
    id            BIGSERIAL PRIMARY KEY,
    target_id     BIGINT NOT NULL,
    template_code VARCHAR(10) NOT NULL,          -- T1 / T2 / T3
    scheduled_at  TIMESTAMP NOT NULL,             -- (target.scheduleBase + offset) at (tier의 hour:minute)
    kind          VARCHAR(20) NOT NULL,           -- NOTIFICATION / AD
    status        VARCHAR(20) NOT NULL,           -- PENDING / PROCESSING / DONE / FAILED
    attempt_count INT NOT NULL DEFAULT 0,
    last_error    VARCHAR(500),
    picked_at     TIMESTAMP,
    processed_at  TIMESTAMP,
    created_at    TIMESTAMP NOT NULL,
    updated_at    TIMESTAMP,
    -- (target_id, template_code, DATE(scheduled_at)) 유니크 — 하루 한 번 원칙
    CONSTRAINT ux_sms_queue UNIQUE (target_id, template_code, scheduled_at)
);
CREATE INDEX idx_sms_queue_pending ON sms_dispatch_queue (status, scheduled_at) WHERE status = 'PENDING';
```

**2. `SmsImportJob` 확장**
- 대상 등록·CRM 갱신 시 그 대상에 대한 T1/T2/T3 큐 3행도 함께 INSERT (멱등, `ON CONFLICT DO NOTHING`)
- `scheduled_at` = `schedule_base + offsetOf(group, tier)` 에 `timeOf(tier)` 시각 적용
- 홀딩된 대상은 큐 등록 skip (SENDABLE 만 등록)
- 오프셋·시각 변경 시 미발송(status=PENDING) 큐 행의 `scheduled_at` 재계산 — 트리거는 오프셋 편집 API 안에서

**3. `SmsDispatchJob` (`postgres-mart` + `sms.dispatch.enabled=true`)**
- 매 5분 실행 (cron `0 */5 * * * *`)
- 큐 폴링:
  ```sql
  SELECT * FROM sms_dispatch_queue
  WHERE status = 'PENDING' AND scheduled_at <= NOW()
  ORDER BY scheduled_at
  LIMIT :batch_size
  FOR UPDATE SKIP LOCKED;
  ```
- 각 행마다:
  - `kind='AD'` + 현재 시각이 window 밖 → skip (다음 실행 때 재검토)
  - status → PROCESSING · picked_at 기록
  - `SmsSendService.send()` 재사용 (기존 홀딩·수신거부·문구 미설정 등 skip 로직 그대로)
  - 성공 → DONE · processed_at
  - 실패 → FAILED · attempt_count++ · last_error · 다음 실행 재시도 후보

**4. `application.yml`**
```yaml
sms:
  dispatch:
    enabled: ${SMS_DISPATCH_ENABLED:false}     # local/dev 기본 false, prod 는 env
    cron: "0 */5 * * * *"                       # 매 5분
    batch-size: ${SMS_DISPATCH_BATCH_SIZE:50}   # 한 번에 처리할 큐 행 수
    daily-limit: ${SMS_DISPATCH_DAILY_LIMIT:500}
    max-attempts: ${SMS_DISPATCH_MAX_ATTEMPTS:3}
    ad-window-start-hour: 8
    ad-window-end-hour: 20
```

### 안전장치 (필수)

1. **Solapi dry-run** — 기존 Phase 1 안전장치가 자동으로 걸림. `messageType=DRY_RUN` 으로 sms_send_log 에 남음
2. **광고톡 시간대 가드** — `kind='AD'` 이면 현재 시각이 [8, 20] 밖일 때 skip. 알림톡은 시간 제한 없음
3. **일일 한도** — 그 날 DONE 카운트가 `daily-limit` 초과 시 배치 중단 + Slack
4. **최대 재시도** — `attempt_count >= max-attempts` 인 FAILED 는 자동 재시도 안 함. 관리자가 재실행 API 로 명시적으로 처리
5. **문구 미설정 skip** — 기존 `slot.sendable()` (실패로 안 남고 SKIP 로그)
6. **홀딩 존중** — `SmsSendService` 안에 기존 체크. 큐 등록 시점에도 SENDABLE 만 넣음
7. **수신거부 재확인** — 발송 직전 3중 방어(기존)
8. **중복 발송 방지** — 큐의 UNIQUE 제약 + `sms_send_log` 의 (target, tier, cycle_base) 제약 2중
9. **트랜잭션 미묶기** — 대상별 개별 트랜잭션. 큐 상태 갱신과 실제 발송을 하나 트랜잭션에 안 묶어 API 실패가 큐를 오염 안 시킴

### 관리자 개입 지점

- 홀딩 (사람 or 특정 차수 skip) — 기존 화면
- 큐 강제 재실행: `POST /api/admin/batch/sms/queue/retry?ids=1,2,3` — FAILED 행을 PENDING 으로 되돌림
- 발송 결과 화면 (`basis=SENT`) — 실시간 확인
- 큐 대기 상태 조회: `GET /api/admin/batch/sms/queue?status=PENDING&limit=50`
- Slack 실패 임계치 초과 알림 → 화면에서 개별 확인

### 오프셋·시각 편집 시 큐 재계산

- 오프셋 편집 API 안에서 `sms_dispatch_queue WHERE status='PENDING'` 을 새 오프셋·시각으로 재계산
- 관리자가 오프셋을 바꿔도 이미 발송된 것은 그대로, 대기 중인 큐만 새 시각으로 재정렬

---

## 5. Phase 3 — 결과 동기화 배치 (SmsResultSyncJob)

### 스코프

1. `SmsResultSyncJob`
   - 매일 15:00 실행 (발송 6시간 후, 대부분 도달 완료)
   - `sms_send_log` 에서 `delivered_at IS NULL AND status='PENDING'` 인 최근 24시간 로그 조회
   - 솔라피 API 로 `solapi_message_id` 별 상태 조회 → `sms_send_log` + `sms_dispatch_queue` 갱신
2. 지금의 `SolapiSyncService.sync(from, to)` 재사용
3. `batch_run_log` 에 결과 통계
4. 큐 연동: 도달 실패로 확인된 건은 `sms_dispatch_queue.status=FAILED` 로 되돌리고 재시도 대상에 넣음

### 안전장치

- 솔라피 API 실패 → 로그만 남기고 배치 성공 처리 (다음 날 재시도)
- rate limit 대응: chunking (100건씩)
- dry-run 발송(`messageType=DRY_RUN`) 은 sync 대상에서 제외

---

## 6. 마이그레이션 계획

### V-번호 배정

| 번호 | 내용 | Phase | 상태 |
|------|------|-------|------|
| V59 | `sms_management` (sms_target + sms_send_log) | 0 | ✅ 완료 |
| V60 | `sms_opt_out` | 0 | ✅ 완료 |
| V61 | `sms_offset_config` (offsets + times + kinds 통합) | 1A | ✅ 완료 |
| V62 | `sms_dispatch_queue` (신규 · queue table) | 2 | ✅ 완료 |

### 실행 순서

- 각 스크립트는 `MartSchemaInitializer.applyDdlScripts()` 의 SMS 섹션에 순차 등록
- 모두 idempotent (`CREATE ... IF NOT EXISTS` + `ALTER ADD IF NOT EXISTS` + `INSERT ON CONFLICT DO NOTHING`)
- 재기동 시 관리자 편집분 보존

### 롤백 시나리오

- Phase 1A: `SolapiProperties.offsetDays` 에서 서비스 조회 대신 fallback 만 쓰도록 되돌리면 됨. DB 표 그대로 둬도 무해
- Phase 1B: `findRowsAutoImport` 안의 자동 upsert 호출을 되살리면 화면이 다시 자동 적재. 배치는 안 돌리기
- Phase 2: `sms.dispatch.enabled=false` 로 즉시 중단. 관리자 화면 수동 발송은 유지. 큐 표는 그대로 (다음 활성 시 큐 이어서 처리)
- Phase 3: `sms.result-sync.enabled=false`. 로그 미완성 상태로 남지만 조회 계속 동작

---

## 7. 관리자 화면 재정의 (Phase 2 이후 목표)

### Phase 1 시점에서 이미 반영된 부분

- **조회 = 조회만** — 자동 적재 없음 · 성능 개선 ✅
- **오프셋 그리드** — 상단 접힘 카드로 4×3 매트릭스 편집 ✅
- **수신거부 관리 모달** — 툴바 버튼에서 열기 · 목록 + 해제 ✅

### Phase 2 이후 추가될 부분

- **큐 상태 요약** — 오늘 PENDING·PROCESSING·DONE·FAILED 카운트 (툴바 위 KPI)
- **큐 재실행 버튼** — 특정 FAILED 큐 항목 강제 재시도
- **자동 발송 시각 배지** — 각 대상 행에 "다음 T2 발송: 오늘 10:00 예정" 실시간 표시

### 지금 그대로 유지되는 부분

- 검색·필터 (기간·차수·상태)
- 홀딩·해제 · 연락처 수정 · 수동 등록
- 발송 이력 조회
- 문구 미설정 슬롯 시각적 경고
- 오프셋·시각·종류 편집 (Phase 1A)
- 수신거부 관리 모달 (Phase 1)

---

## 8. 관측 (Observability)

### batch_run_log 통합

| jobName | table_stats 예시 |
|---------|-----------------|
| `orchestrator[SMS]` | `{sms_target_created: 27, sms_target_updated: 3, sms_target_skipped: 5, sms_queue_enqueued: 81}` |
| `sms-dispatch[2026-08-28-10:00]` | `{picked: 20, sent: 18, skipped: 1, opt_out: 0, out_of_window: 0, failed: 1}` |
| `sms-result-sync[2026-08-28]` | `{synced: 18, still_pending: 0, failed: 0, requeued: 1}` |

### Slack

- 실패 → `BatchSlackNotifier.notifyFailure`
- 정상 종료 요약 (dispatch 는 카운트만)
- **임계치 알림** — FAILED 큐 행이 10 개 이상 누적 시 별도 알림 (관리자 개입 신호)

### 대시보드 위젯 후보

- 최근 7일 SMS 발송량 (일별 · 그룹별 · 차수별)
- 미도달 비율 (delivered / sent)
- 큐 상태 스냅샷 (PENDING · PROCESSING · FAILED 카운트)
- 홀딩·수신거부 누적

---

## 9. 결정 필요 지점 (Open)

### ✅ Phase 1 착수 전 확정된 것

1. Phase 우선순위 → (a) 점진 이관: 1A → 1B → 2 → 3 **채택**
2. 오프셋 UI 위치 → (i) 문자 발송 리스트 상단 접힘 카드 **채택**
3. 자동 발송 승인 흐름 → (a) 완전 자동 + dry-run 안전장치 **채택**

### ⏳ Phase 2 착수 전 확정 필요

1. **재시도 정책 (핵심 미결)**
   - 방식: `attempt_count < max-attempts` 이면 자동 재시도 (다음 5분 실행 때). max 도달 후 FAILED 유지 · 관리자 개입 필요
   - 최대 재시도 횟수: 기본 3 회 (env 로 조정 가능)
   - 재시도 간격: 큐 폴링이 5분 주기라 최소 5분. 지수 백오프는 도입 안 함 (복잡도 대비 실익 낮음)

2. **오프셋 편집 시 큐 재계산 트리거**
   - (a) 오프셋 편집 API 안에서 sync 재계산 — 응답 지연 소폭 늘어남
   - (b) 별도 이벤트 큐잉 — 편집은 빠르고 재계산은 비동기
   - 권장: (a) — 하루 편집 몇 번 안 되고 대상 100 명 규모라 부담 없음

3. **문구·템플릿 준비 여부** (Phase 2 개발과 병행)
   - 4그룹 × 3차수 = 12 슬롯 알림톡·SMS 문구 준비 필요
   - 부분 준비도 안전 (미설정 슬롯은 자동 skip) — 준비 안 된 대상 사전 파악 필요

4. **큐 자동 정리**
   - DONE 큐 행이 계속 쌓이면 표 커짐
   - 방안 (a) 별도 잡이 30일 이후 DONE 행 아카이빙 · (b) 그대로 두고 감사 근거로 유지
   - 권장: 초기엔 (b) — 규모가 커지면 (a) 도입

---

## 10. 관련 파일

### 완료된 코드 (Phase 0 ~ 1)

- 백엔드
  - `com.bviit.analytics.sms.*` — 원본 이관 28 파일 + Phase 1 추가 (SmsOffsetConfig 관련 5 · SmsImportJob 1)
  - `sql/mart/sms/tables/V59__sms_management.sql`, `V60__sms_opt_out.sql`, `V61__sms_offset_config.sql`
  - `sql/sms/select-*.sql` (3 파일)
  - `SecurityConfig` · `application.yml` (solapi 섹션 + dry-run) · `MartSchemaInitializer`
  - `BatchOrchestrator` (Domain.SMS 추가)
- 프론트
  - `pages/sms/*` — 원본 이관 14 파일 + Phase 1 추가 (SmsOffsetGrid, SmsOptOutModal)
  - `api/sms/index.ts` · `hooks/sms/useSmsManagement.ts` · `hooks/sms/useSmsOffsets.ts`

### Phase 2 신규 예정

- 백엔드
  - `sql/mart/sms/tables/V62__sms_dispatch_queue.sql`
  - `com.bviit.analytics.sms.entity.SmsDispatchQueue`
  - `com.bviit.analytics.sms.repository.SmsDispatchQueueRepository`
  - `com.bviit.analytics.sms.service.SmsDispatchQueueService` (큐잉 · 폴링 · 재계산)
  - `com.bviit.analytics.batch.job.SmsDispatchJob`
  - `SmsImportJob` 확장 — 큐 3행 등록
  - `SmsOffsetConfigService` 확장 — 편집 시 큐 재계산 트리거
  - Admin API 확장 — `/api/admin/batch/sms/queue/*`
- 프론트
  - `pages/sms/SmsQueueStatusCard.tsx` (큐 상태 요약)
  - `pages/sms/SmsFailedQueueModal.tsx` (실패 재실행)

### Phase 3 신규 예정

- 백엔드
  - `com.bviit.analytics.batch.job.SmsResultSyncJob`
  - `SolapiSyncService` 확장 — 큐 상태 갱신 연동

### 문서

- 기획서: `docs/기획/sms.html`
- 이 문서: `docs/sms/strategy.md`

---

## 11. 진행 이력

| 날짜 | 단계 | 커밋 | 내용 |
|------|------|------|------|
| 2026-08-28 | Phase 0 | `afa0820` | 08-14 브랜치에서 SMS 스택 전체 이관 (feat/sms) |
| 2026-08-28 | Docs | `e2574cc` | 자동화 전략 문서 초안 (v1: 큐 없이 basis=SCHEDULED) |
| 2026-08-28 | Phase 1 | `a7f0d1f` | Phase 1A + 1B + 수신거부 UI + dry-run + 엔티티 정리 통합 |
| 2026-08-28 | Docs | `a7f0d1f` | Phase 1 완료 반영 + Phase 2 큐 테이블 방식 재설계 |
| 2026-08-31 | Phase 2 | (이 커밋) | V62 큐 · SmsDispatchQueueService · SmsDispatchJob · SmsImportJob/OffsetService/TargetService 훅 · Admin API · SmsQueueStatusCard/SmsFailedQueueModal |
| _다음_ | Phase 3 | | 결과 동기화 배치 + 큐 상태 갱신 |
