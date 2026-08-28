# 문자 발송 관리(SMS) 자동화 전략

> 작성일: 2026-08-28
> 상태: **Phase 0 완료 (08-14 브랜치 이관)** — 프론트·백엔드·마이그레이션·인증 스택은 붙었다. 자동화는 이 문서 이후 단계.
> 목적: 지금의 "화면 조회 = 자동 적재" 임시 경로를 정리하고, 오프셋·발송·결과 동기화를 **배치 + UI 편집**으로 옮기기 위한 설계·마이그레이션 계획

> 📌 관련 문서
> - 기획서(고객케어 TF v5): `docs/기획/sms.html`
> - 배치 전략 상위 규약: `docs/databatch/strategy.md`
> - 배치 실행 규칙(스케줄·마트별 write 정책): 위 §12

---

## 0. 현재 상태 (Phase 0 — 이관 직후)

### 데이터 흐름 (임시)

```
       관리자 화면
            │  GET /api/sms-management/targets
            ▼
   SmsTargetService.findRowsAutoImport
            │
            ├─ Step 1) importFromSurgeryList(from, to)
            │      · list_surgery → sms_target 로 upsert
            │      · AUTO 는 CRM 값 바뀌면 UPDATE, MANUAL 은 손 안 댐
            │
            └─ Step 2) findRows(from, to, basis, templateCode)
                   · sms_target + sms_send_log 조인해서 화면 반환
```

### 오프셋 정의

`SurgeryGroup.java` 안의 컴파일 타임 상수 (변경하려면 재빌드 필요):

| 그룹 | 1차 | 2차 | 3차 | 대표 opType |
|------|-----|-----|-----|-------------|
| SMILE | D+1 | D+7 | D+14 | smilePro · smile |
| LASIK | D+1 | D+7 | D+14 | lasik |
| LASEK | D+5 | D+7 | D+14 | lasek |
| ICL | D+3 | D+7 | D+14 | icl · tIcl · kpl · tKpl · viva |

> ⚠️ **백내장·재수술·프레스비욘드는 발송 대상에서 제외.**
> `sql/sms/select-surgery-targets.sql` 이 이미 위 4그룹만 담고 나머지는 마트 조회 단계에서 뺀다.
> 코드 상 `SurgeryGroup.ETC` 는 안전망(미분류 fallback)으로만 남긴다 —
> UI 편집 대상이 아니고, DB 시딩도 하지 않는다. 만약 어떤 opType 이 예상 밖으로 ETC 로 떨어지면
> 오프셋·문구 슬롯이 모두 없어 자연히 발송에서 skip 된다.

### 발송

관리자가 화면에서 대상 선택 + 차수 지정 → `POST /send` → `SmsSendService` 가 솔라피 호출.
**자동 발송·자동 결과 동기화는 없다**.

### 남은 임시 구조 (해소 대상)

1. 화면 조회 시 upsert 반복 (조회당 200회 규모)
2. 발송·결과 동기화는 사람이 버튼을 눌러야 실행
3. 오프셋 변경은 코드 수정 + 재빌드
4. 관측 채널 없음 — 배치가 아니라 화면 요청이라 `batch_run_log` 에 안 잡힘

---

## 1. 목표 구조

### 데이터 흐름 (자동화 이후)

```
   03:30 SmsImportJob            09:00 SmsDispatchJob        15:00 SmsResultSyncJob
        │                              │                              │
        ▼                              ▼                              ▼
  list_surgery (마트)          sms_target × 그날 예정          솔라피 API
        │                              │                              │
        ▼ upsert                       ▼ 실제 발송                    ▼ delivered_at 갱신
   sms_target                    sms_send_log                    sms_send_log
        │                              │                              │
        └────────── (모두 postgres-mart) ──────────────────────────────┘
                                       │
                                       ▼
                              관리자 화면 (SELECT-only)
                              · 예외 대응(홀딩·연락처 수정·수신거부)
                              · 오프셋 그리드 편집
                              · 발송 이력 감사
```

### 오프셋 저장 위치 변경

- `sms_offset_config` 테이블 (그룹 code PK · tier1/2/3 offset · updated_by/at)
- `SolapiProperties.offsetDays()` 가 캐시된 DB 값 참조
- Admin UI 그리드에서 편집. 저장 즉시 캐시 invalidate → 다음 배치 실행부터 반영
- `SurgeryGroup.offsets` 는 fallback / 문서 역할로 남김 (DB 미시딩 시 안전망)

### 발송 시각·메시지 종류 저장

- **`sms_offset_config` 단일 표에 통합** — V61 CREATE 안에 오프셋·시각·종류 컬럼 모두 포함 (별도 마이그레이션 없음)
- **시각**: `tier1_time`·`tier2_time`·`tier3_time` (TIME 타입, HH:mm 정밀도, DEFAULT 10:00)
- **메시지 종류**: `tier1_kind`·`tier2_kind`·`tier3_kind` (VARCHAR, `NOTIFICATION`/`AD`, DEFAULT NOTIFICATION)
- **규약**: 시각·종류는 tier-level 이라 4행 모두 같은 값을 유지. 서비스가 편집 시 4행 원자적 동일 값 UPDATE
- **종류별 유효성**:
  - `NOTIFICATION` (알림톡) — 정보성, **시간 제한 없음** (0..23시 자유)
  - `AD` (광고톡) — 광고성, 정보통신망법상 21~08 금지 → hour 8..20 강제
- 캐시는 오프셋과 같은 인스턴스 — 시각·종류 변경도 `SmsOffsetConfigService.refresh()` 로 함께 반영
- Phase 2 dispatch 배치가 이 값을 참조 (§4)
- 향후 그룹별 시각·종류가 필요해지면 컬럼 규약을 풀면 됨 (스키마 변경 없음)

---

## 2. Phase 1A — 오프셋 DB화 + UI 편집 그리드

### 스코프
1. 마이그레이션 `V61__sms_offset_config.sql` — 오프셋·시각·종류 통합 CREATE (별도 마이그레이션 없이 최초부터 완성 스키마)
   ```sql
   CREATE TABLE IF NOT EXISTS sms_offset_config (
       group_code   VARCHAR(20) PRIMARY KEY,
       tier1_offset INT NOT NULL, tier2_offset INT NOT NULL, tier3_offset INT NOT NULL,
       tier1_time   TIME NOT NULL DEFAULT '10:00',
       tier2_time   TIME NOT NULL DEFAULT '10:00',
       tier3_time   TIME NOT NULL DEFAULT '10:00',
       tier1_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       tier2_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       tier3_kind   VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
       updated_by   VARCHAR(50), updated_at TIMESTAMP
   );
   INSERT INTO sms_offset_config (group_code, tier1_offset, tier2_offset, tier3_offset)
   VALUES ('SMILE',1,7,14),('LASIK',1,7,14),('LASEK',5,7,14),('ICL',3,7,14)
   ON CONFLICT (group_code) DO NOTHING;
   ```
2. `SmsOffsetConfig` 엔티티 + `SmsOffsetConfigRepository`(JPA)
3. `SmsOffsetConfigService`
   - `getAll()` → 캐시된 Map<String, int[]>
   - `update(group, tier1, tier2, tier3, actor)` → DB 갱신 + 캐시 invalidate + 감사 로그
4. `SolapiProperties.offsetDays(templateCode, opType)` 를 offsetService 조회로 교체
   - 캐시 미스 시 `SurgeryGroup.of(opType).offsets()` fallback
5. Admin API
   - `GET /api/sms-management/offsets` → 4×3 그리드
   - `PUT /api/sms-management/offsets` (배열 한 번에) — 원자적 갱신
6. 프론트 UI
   - `pages/sms/SmsOffsetGrid.tsx` — 문자 발송 리스트 화면 상단 접힘 카드
   - 상단: 차수별 시각(HH:mm) + 종류(알림톡/광고톡) 각 3세트
   - 하단: 오프셋 그리드 = **4 × 3** (SMILE·LASIK·LASEK·ICL × 1/2/3차). ETC 는 노출·편집 대상 아님.
   - 유효성:
     - 오프셋 0..30 · `tier1 ≤ tier2 ≤ tier3`
     - 시각 HH:mm 필수
     - 광고톡 선택 시 hour 8..20 강제 · 알림톡은 제한 없음
   - 저장 후 화면 재조회 (예정일이 즉시 새 값 반영)

### 유효성 규칙 (확정)

- 오프셋: 각 정수 0..30, `tier1 ≤ tier2 ≤ tier3` (같아도 허용)
- 그룹: **SMILE·LASIK·LASEK·ICL 4종만** 편집 가능. ETC 로 오는 요청은 400
- 시각: HH:mm 필수
- 종류: `NOTIFICATION` / `AD` 만
- **광고톡 시간 제한**: `AD` 종류일 때 hour ∈ [8, 20]. 알림톡은 제한 없음 (정보성 메시지라 정보통신망법 규제 대상 아님)
- 위반 시 400 응답 · UI 는 저장 버튼 disabled

### 영향 범위

오프셋 산식은 실시간 lookup 이라 **저장 즉시 반영**:
- 미발송 차수의 예정일 재계산 → 화면에 다음 배치 실행 이전에도 새 예정일이 보임
- **이미 발송된 로그(sms_send_log)는 그대로** — 사이클 개념 유지
- 캐시 TTL 없이 pub-sub 형태로 즉시 무효화 (Spring 이벤트 or 단순 flag)

### 테스트

- `SmsOffsetConfigServiceTest` — 유효성·감사·캐시 무효화
- 기존 `SmsDomainRulesTest` 는 그대로 유지 (SurgeryGroup 기본값 fallback 검증)

---

## 3. Phase 1B — Import 배치 승격 + 화면 정리

### 스코프

1. `SmsImportJob` (`postgres-mart` 프로파일)
   - 지금 `SmsTargetService.importFromSurgeryList(from, to)` 로직을 잡으로 래핑
   - `BatchOrchestrator.Domain` 에 `SMS` 추가
   - Domain 순서: `SURGERY` 뒤에 배치 (list_surgery 를 소스로 쓰므로)
   - Slack 알림 통합 (기존 `BatchSlackNotifier`)
2. `BatchOrchestrator` 통합
   - 데일리 03:00 배치가 `SMS` 도메인도 실행
   - 월간 재조정(1일 03:30)이 전월 전체 재적재
   - 관리자 부분 실행 지원: `orchestrator.runManual(from, to, EnumSet.of(Domain.SMS))`
3. 화면 정리
   - `SmsTargetService.findRowsAutoImport` 에서 `importFromSurgeryList` 호출 삭제
   - 메서드명 `findRowsAutoImport` → `findRows` 로 정리
   - `POST /targets/import` 는 백업 재실행용으로 유지 (관리자가 특정 범위 강제 재적재)
4. `application-local.yml` 은 배치 비활성 유지 (H2 → 마트 없음), `application-dev/prod.yml` 은 활성

### 왜 이 순서

- Phase 1A 를 먼저 해야 오프셋 편집 UI 가 준비된 상태로 배치 시작. 만약 1B 먼저 하면 배치가 하드코딩된 오프셋으로 이미 예정일을 계산해 발송을 준비할 수 있음
- 두 단계는 커밋·릴리즈 독립. 1B 릴리즈 시 오프셋은 아직 코드 상수라 안전

### 안전장치

- **min-year 가드** — 다른 잡과 동일하게 `batch.mart.min-year=2026` (기본). D-1 이 2025-12-31 이면 skip
- **트랜잭션 단위 all-or-nothing** — Import 도중 실패 시 롤백 (기존 `@Transactional` 유지)
- **관측** — `batch_run_log.table_stats` 에 `sms_target created/updated/skipped` 각 카운트

### 성능 예상

- D-1 하루치 수술자 = 평균 20~30명
- Full month 재조정 = 500~700명
- 매 호출마다 도는 지금 대비 조회 성능은 크게 개선 (upsert 사라짐)

---

## 4. Phase 2 — 자동 발송 배치 (SmsDispatchJob)

### 스코프

1. `SmsDispatchJob` (`postgres-mart` + `sms.dispatch.enabled=true`)
   - 매일 09:30 실행 (정보통신망법 야간 발송 금지 08~09 이후 여유)
   - 대상 조회: `basis=SCHEDULED, from=today, to=today` (오늘 예정일 도래)
   - 차수는 3개 순회 (T1·T2·T3 각각) — 같은 대상이 여러 차수에 걸릴 수 있음
   - 각 대상마다 지금의 `SmsSendService.send` 재사용
2. `application.yml`
   ```yaml
   sms:
     dispatch:
       enabled: ${SMS_DISPATCH_ENABLED:false}  # local/dev 기본 false
       cron: "0 30 9 * * *"                    # 09:30 Asia/Seoul
       dry-run: ${SMS_DISPATCH_DRY_RUN:true}   # 실 발송 여부
       daily-limit: ${SMS_DISPATCH_DAILY_LIMIT:500}
       window-start-hour: 9                    # 발송 허용 시작 시(포함)
       window-end-hour: 21                     # 발송 허용 종료 시(제외)
   ```
3. 프로파일별 활성/기본값
   - `local`: enabled=false (H2 로 실행 불가)
   - `dev`: enabled=true · dry-run=true (실제 API 호출 안 함 · Slack 만)
   - `prod`: enabled=true · dry-run=false + 시크릿은 별도 env 로

### 안전장치 (필수)

1. **시간대 가드** — cron 이 아니라 코드 안에서도 재확인 (현재 시각이 window 밖이면 skip). 배치 재실행이나 수동 실행 대비.
2. **드라이런 모드** — `dry-run=true` 이면 로그만 남기고 솔라피 호출 안 함. dev 기본값.
3. **일일 한도** — `daily-limit` 초과 시 배치 중단 + Slack 경고. 스팸 성 사고 방지.
4. **문구 미설정 skip** — 기존 `slot.sendable()` 로직 유지 (ETC 문구 미설정이면 skip).
5. **홀딩 존중** — 기존 로직 유지.
6. **수신거부 재확인** — 발송 직전 `SmsOptOutRepository.existsByPhone` (경합 방지).
7. **중복 발송 방지** — `alreadySent(target, template.code(), cycle_base)` 유지. 사이클 개념이라 재조정된 대상은 새 발송 허용.
8. **트랜잭션 미묶기** — 대상별 개별 트랜잭션. 하나 실패해도 다른 대상 발송은 진행. 실패는 로그로 기록.
9. **Slack 요약** — 배치 종료 시 (SENT / SKIPPED / FAILED / OPT_OUT / OUT_OF_WINDOW) 카운트.

### 관리자 개입 지점

- 홀딩 (사람 or 차수 skip)
- 재실행 (`POST /api/admin/batch/sms/dispatch?date=YYYY-MM-DD` — 특정 날 재발송)
- 오늘 발송 결과 화면 (`basis=SENT`) 실시간 확인
- Slack 실패 알림 → 화면에서 개별 대상 확인 → 대응

### 결정 필요

- **관리자 사전 승인 필요?** — 배치가 실행 전에 대기 → 관리자가 리뷰 후 confirm → 발송. 안전 vs 자동화 취지 반감. (권장: **자동 진행 + Slack 사후 알림 + 대시보드 감사**)
- **재발송 정책** — 실패한 대상 다음 날 자동 재시도할지 여부. 사이클 개념이라 자연스러운 재시도가 없어서 명시 필요.

---

## 5. Phase 3 — 결과 동기화 배치 (SmsResultSyncJob)

### 스코프

1. `SmsResultSyncJob`
   - 매일 15:00 (발송 6시간 후, 대부분 도달 완료된 시점)
   - `sms_send_log` 에서 `delivered_at IS NULL AND status='PENDING'` 인 최근 24시간 로그 조회
   - 솔라피 API 로 `solapi_message_id` 별 상태 조회 → 로컬 갱신
2. 지금의 `SolapiSyncService.sync(from, to)` 재사용 — 이미 존재하는 로직
3. `batch_run_log` 에 결과 통계

### 안전장치

- 솔라피 API 실패 → 로그만 남기고 배치 성공 처리 (다음 날 재시도)
- rate limit 대응: 배치가 chunking (100건씩)

---

## 6. 마이그레이션 계획

### V-번호 배정

| 번호 | 내용 | Phase |
|------|------|-------|
| V59 | sms_management (기존 · sms_target + sms_send_log) | 0 (완료) |
| V60 | sms_opt_out (기존) | 0 (완료) |
| V61 | sms_offset_config — 오프셋 + 시각(TIME) + 종류(NOTIFICATION/AD) 통합 CREATE · seed 4행 | 1A |

### 실행 순서

- V61 은 `MartSchemaInitializer.applyDdlScripts()` 의 SMS 섹션에 추가
- seed 는 DDL 안에 `ON CONFLICT DO NOTHING` 으로 idempotent
- 재기동 시 이미 있는 행은 건드리지 않음 (관리자가 UI 로 편집한 값 보존)

### 롤백 시나리오

- Phase 1A 롤백: 코드에서 `SmsOffsetConfigService` 를 뺐다가 `SurgeryGroup.offsets` fallback 만 남기면 됨. DB 표는 그대로 둬도 무해.
- Phase 1B 롤백: `SmsTargetService.findRowsAutoImport` 안의 `importFromSurgeryList` 호출을 되살리면 화면이 다시 자동 적재. 배치는 안 돌리기.
- Phase 2 롤백: `sms.dispatch.enabled=false` 로 즉시 중단. 관리자 화면 수동 발송은 유지.
- Phase 3 롤백: `sms.result-sync.enabled=false`. 로그는 미완성 상태로 남지만 조회 자체는 계속 동작.

---

## 7. 관리자 화면 재정의 (자동화 이후)

### 지금과 달라지는 부분

- **조회 = 조회만** — 자동 적재 없음 · 성능 개선
- **오프셋 그리드** — 화면 상단 접힘 카드로 4×3 매트릭스 편집
- **자동 발송 상태 요약** — 최근 배치 실행 시각·결과 (`basis=SENT&from=today` 위에 KPI)
- **재실행 버튼** — 관리자가 D-1 재적재·오늘 재발송 트리거 가능 (`/api/admin/batch/sms/*`)

### 지금 그대로 유지되는 부분

- 검색·필터 (기간·차수·상태)
- 홀딩·해제 · 연락처 수정 · 수동 등록 · 수신거부
- 발송 이력 조회
- 문구 미설정 슬롯 시각적 경고

---

## 8. 관측 (Observability)

### batch_run_log 통합

| jobName | table_stats 예시 |
|---------|-----------------|
| `orchestrator[SMS]` | `{sms_target: 27, sms_target_updated: 3, sms_target_skipped: 5}` |
| `sms-dispatch[2026-08-28]` | `{sent: 18, skipped: 2, opt_out: 1, out_of_window: 0, failed: 0}` |
| `sms-result-sync[2026-08-28]` | `{synced: 18, still_pending: 0, failed: 0}` |

### Slack

- 실패 → `BatchSlackNotifier.notifyFailure` 재사용
- 정상 종료도 요약 알림 (Dispatch 는 특히) — spam 방지 위해 카운트만

### 대시보드 위젯 후보

- 최근 7일 SMS 발송량 (일별 · 그룹별)
- 미도달 비율 (delivered / sent)
- 홀딩·수신거부 누적

---

## 9. 결정 필요 지점 (Open)

1. **Phase 우선순위**
   - 후보 (a): Phase 1A 먼저 → 1B → 2 → 3 (안전한 점진 이관 · 각 phase 독립 릴리즈)
   - 후보 (b): 1A·1B 동시 → 2 → 3 (한 번에 안정화)
   - **권장: (a)** — 자동 발송(2) 이전에 1A·1B 로 대상·오프셋 관리 UX 를 먼저 검증

2. **오프셋 UI 위치**
   - (i) 문자 발송 리스트 화면 상단 접힘 카드
   - (ii) 별도 관리 페이지 `/admin/sms-offsets`
   - (iii) 관리자 배치 화면 옆 탭
   - **권장: (i)** — 편집과 반영을 같은 화면에서 즉시 확인 가능

3. **자동 발송 승인 흐름**
   - (a) 완전 자동 (Slack 사후 알림 · 감사만 사후)
   - (b) 배치가 후보만 대기열에 올림 → 관리자 confirm 후 발송
   - **권장: (a)** — (b) 는 자동화 취지 반감. 대신 dry-run 을 dev 기본으로 두어 실 발송 전 충분히 검증

4. **재발송 정책**
   - 실패 대상 다음날 자동 재시도할지, 관리자 액션 있어야 할지
   - 사이클 개념(schedule_base) 상 자연스러운 재시도는 없음 — 명시적 정책 필요

5. **문구·템플릿 준비 여부**
   - Phase 2 실행 전 4그룹×3차수 = **12 슬롯** 의 알림톡·SMS 문구 모두 준비돼야 함
     (ETC 슬롯 3개는 발송 대상이 없어 채울 필요 없음 — 코드/env 에는 남지만 안 씀)
   - 준비 안 된 슬롯은 자동 skip 되므로 부분 준비도 안전 — 다만 몇 명이 안 나가는지 사전 파악 필요

---

## 10. 관련 파일

### 코드 (Phase 0 이관 완료)

- 백엔드
  - `com.bviit.analytics.sms.*` (28 파일)
  - `sql/mart/sms/tables/V59__sms_management.sql`, `V60__sms_opt_out.sql`
  - `sql/sms/select-*.sql` (3 파일)
  - `SecurityConfig` · `application.yml` · `MartSchemaInitializer`
- 프론트
  - `pages/sms/*` (14 파일)
  - `api/sms/index.ts` · `hooks/sms/useSmsManagement.ts`

### 신규 (Phase 1A~3 에서 추가 예정)

- 백엔드
  - `sql/mart/sms/tables/V61__sms_offset_config.sql`
  - `com.bviit.analytics.sms.entity.SmsOffsetConfig`
  - `com.bviit.analytics.sms.repository.SmsOffsetConfigRepository`
  - `com.bviit.analytics.sms.service.SmsOffsetConfigService`
  - `com.bviit.analytics.batch.job.SmsImportJob` · `SmsDispatchJob` · `SmsResultSyncJob`
  - `BatchOrchestrator.Domain.SMS`
- 프론트
  - `pages/sms/SmsOffsetGrid.tsx` (4×3 편집 카드)
  - `pages/sms/SmsBatchStatusCard.tsx` (최근 실행·재실행 버튼)

### 문서

- 기획서: `docs/기획/sms.html` (기능 스펙)
- 이 문서: `docs/sms/strategy.md` (자동화 전략)

---

## 11. 진행 이력

| 날짜 | 단계 | 내용 |
|------|------|------|
| 2026-08-28 | Phase 0 | 08-14 브랜치에서 SMS 스택 전체 이관 (커밋 `afa0820`, 브랜치 `feat/sms`) |
| _다음_ | Phase 1A | 오프셋 DB화 + UI 편집 그리드 |
| _다음_ | Phase 1B | Import 배치 승격 + 화면 정리 |
| _다음_ | Phase 2 | 자동 발송 배치 + 안전장치 |
| _다음_ | Phase 3 | 결과 동기화 배치 |
