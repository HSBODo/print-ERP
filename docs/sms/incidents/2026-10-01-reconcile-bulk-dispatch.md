# 2026-10-01 SMS 월배치 알림톡 몰림 사고

- **발생 시각**: 2026-10-01 03:30~04:30 KST
- **직접 피해**: 9월 수술자 중 **161명이 알림톡 수신** (160명은 T1+T2+T3 3통 몰림 · 1명은 T1+T2 2통)
- **큐 적재**: 182 신규 target × 3차 = 546건 (DONE 482 · CANCELED 60 · FAILED 4)
- **2차 영향**: 사고로 일일 발송 한도(500) 조기 소진 → 10/1 10:00 정상 발송 **125건 묶임** (T1 15 · T2 110)
- **중복 발송 여부**: ❌ 중복 아님. 161명은 모두 9월에 한 번도 안내를 받지 않은 신규 수신자. 세 차수가 몰려 도착했을 뿐.
- **상태**: 큐 복구 완료 · 코드 fix 미착수 (11/1 전 필수) · 일일 한도 임시 상향 운영 결정 중

---

## 1. 사고 경위

### Timeline
| 시각 (KST) | 이벤트 |
|---|---|
| 03:00 | 데일리 배치 (D-1=Sept 30 처리) 정상 수행 |
| 03:30 | 월배치 `BatchOrchestrator.runMonthlyReconcile` 시작, 범위 2026-09-01~09-30 |
| 03:30~ | `SmsImportJob.run` 가 9월 수술자 재적재. 지금까지 `sms_target` 에 없던 **182명 신규 insert** |
| 03:30~ | `enqueueForTargets` 가 신규 182명에 대해 T1·T2·T3 큐 insert. 세 차수 scheduled_at 이 전부 과거 → clamp 로 Oct 1 03:30 로 저장 → PENDING |
| 03:35~ | `SmsDispatchJob` 5분 폴러가 PENDING 긁어감 → Solapi 호출 → 알림톡 발송 |
| ~04:30 | 사고 범위 큐 적재/발송 종료 |
| 10:00 | 10/1 10:00 정상 scheduled PENDING 147건 — 사고 범위와 별개, 정상 발송 예정 |

### Root cause (현재까지 추정)

#### 직접 원인 — `SmsDispatchQueueService.enqueueForTarget` 의 clamping 과 즉시 폴링 결합
```java
LocalDateTime scheduledClamped = scheduled.isBefore(now) ? now : scheduled;
```
- `enqueueForTarget` 가 과거 예정분을 `now` 로 clamp 해 저장.
- 신규 target 의 T1·T2·T3 세 차수 scheduled 가 모두 과거(수술일 + 소량 오프셋 < Oct 1 03:30)이면 **세 차수 전부 clamp**.
- 5 분 폴러가 Oct 1 03:35 에 세 차수를 거의 동시에 발송.
- 결과: 한 사람에게 수술 당일/7일차/14일차 안내가 몇 분 간격으로 도착.

#### 근원 원인 — 9월 데일리 배치가 182명을 못 찾았음
- 데일리 배치는 매일 D-1 수술자만 처리. `SmsSurgeryImportRepository.findSurgeryRows` 가 뽑는 조건과 마트 적재 타이밍 사이에 **지연** 이 있을 것으로 의심.
- 수술은 9월에 벌어졌는데 9월 데일리 배치가 처리할 시점에 마트에 아직 안 들어와 있던 사람들.
- 월배치가 9월 범위 전체를 다시 훑으면서 비로소 발견 → 과거 예정 T1·T2·T3 가 한꺼번에 enqueue.

---

## 2. 조사 결과

### Table 1 — `sms_dispatch_queue` (복구 완료)

#### 2026-10-01 03:30 이후 Sept 수술자 대상 큐 적재 분포
| status | count | 비고 |
|---|---|---|
| CANCELED | 60 | enqueue 됐다가 홀딩 등으로 취소 |
| DONE | 482 | 03:35 전후 실제 발송·도달 (**= 실제 알림톡 발송 건수**) |
| FAILED | 4 | Solapi 접수 실패 (3회 재시도 후 종료, 알림톡 안 나감) |
| PENDING / PROCESSING | **0 / 0** | ✅ 미래 시한폭탄 없음 — 전부 clamp 되어 터미널 전이됨 |

→ 546건 전체에 `last_error` 끝에 `[POLLUTED_RECONCILE_20261001]` 식별 태그 부착.

#### 전체 큐 미래 중복 위험 검증
- 전체 큐 PENDING = **681건**
  - 10/1 10:00 = 147
  - 10/2~10/14 = 534
- PENDING 중 "같은 (target, template_code) 로 다른 큐 row 가 존재" 하는 건 = **0건** → **미래 중복 발송 리스크 없음** 확정.
- 즉 681 PENDING 전부 "그 사람 그 차수의 유일한 큐 row" 로 정상 발송 예정.

### Table 2 — `sms_target` (조치 없음)

| 구분 | 건수 | 조치 |
|---|---|---|
| 신규 insert (created_at >= 03:30) | 182 | 롤백 불필요. 실제 환자. |
| CRM refresh (updated_at >= 03:30) | 1 (id=95 장승준) | 비(非)스케줄 필드 1개 변경, 큐 영향 0. 롤백 불필요. |
| 손 안 댐 | 489 | — |

- 롤백 안 하는 이유:
  1. 데이터는 CRM 과 일치하는 올바른 값.
  2. 큐 피해는 이미 발생해 되돌릴 수 없음.
  3. **11/1 월배치 범위는 10월만** → Sept 182명을 다시 안 건드림.
  4. 데일리 배치는 `(chart_no, surgery_date)` UNIQUE 로 재 insert 안 됨.

### 기존 target 영향 — 0건 (검증 완료)

**월배치의 `enqueueForTargets` 는 신규/기존 구분 없이 모든 SENDABLE Sept target 490명을 전부 순회** 하지만, 이번 사고에서는 기존 target 소속 큐 적재가 0건:

```sql
-- 검증 쿼리
SELECT COUNT(*)
FROM sms_dispatch_queue q
JOIN sms_target t ON t.id = q.target_id
WHERE q.created_at >= '2026-10-01 03:30:00'
  AND t.surgery_date >= '2026-09-01'
  AND t.surgery_date <  '2026-10-01'
  AND t.created_at   <  '2026-10-01 03:30:00';
-- 결과: 0
```

→ 오염 큐 546건 = 신규 182명 × 3차 (= 546 정확히 일치)

#### 왜 기존 target 에 중복이 안 생겼나

`enqueueForTarget` 멱등 체크의 키 = `templateCode + "@" + scheduled_at`.
기존 target 의 저장된 큐 `scheduled_at` 과 reconcile 재계산값이 일치해서 skip 됐음:

- 기본 오프셋 +1/+7/+14 조건에서 데일리 배치가 수술 **다음 날** 돌 때 scheduled 는 미래 → clamp 안 걸림 → 저장 = 계산.
- 예: id=95 (장승준, 수술 Sept 18, offset +1 → T1 = Sept 19 10:00). 데일리는 Sept 19 03:00 에 돎, T1 scheduled Sept 19 10:00 은 미래라 clamp 없이 그대로 저장. Reconcile 재계산도 Sept 19 10:00 → 매치 → skip.

#### 숨은 시한폭탄 — 조건이 달랐으면 기존 target 도 터짐

이번은 운좋게 비껴간 경우. 아래 조건에서는 기존 target 도 중복 발송:

| 조건 | 왜 터지는가 |
|---|---|
| 어떤 차수 오프셋이 **+0 (수술 당일)** | 데일리 배치가 수술 다음 날 돌 때 scheduled 가 과거 → clamp → 저장값(clamp) ≠ 계산값(원본) → 다음 reconcile 때 새 insert |
| 오프셋 중간에 변경 (예: +7 → +5) | `recalculateScheduledForPending` 은 PENDING 만 업데이트, DONE 은 옛 scheduled 유지 → reconcile 때 미스매치 → 재발송 |
| 관리자가 과거 날짜로 수동 재적재 | 수동 trigger 가 clamp 유발 |
| `op_type` 가 `refreshFromCrm` 로 바뀜 | 다른 그룹의 오프셋 적용 → 저장(옛 그룹) ≠ 계산(새 그룹) → 미스매치 |

→ 근본 멱등성이 `scheduled_at` 축에 의존해서 데이터·설정 변화에 취약. Follow-up 2 (`enqueueForTarget` 멱등 키를 `(target_id, template_code)` 로 좁히는 fix) 가 중요한 이유.

### Table 3 — `sms_send_log` (피해 집계 완료)

#### 발송 요약
| 지표 | 값 | 비고 |
|---|---|---|
| 영향 받은 target 수 | 162 | 182 중 20명은 HOLD/opt-out/ETC 로 큐 CANCELED → 발송 시도 안 됨 |
| 실제 발송 성공 메시지 | **482** | 큐 DONE 482 와 완전 일치 |
| 실패 send_log | 12 | 큐 FAILED 4 × 재시도 3회 = 12 |
| **실제 알림톡 수신자** | **161명** | 사과 안내 대상 |

#### 1인당 수신 메시지 분포
| 받은 수 | 사람 수 | 체감 |
|---|---|---|
| **3건 (T1+T2+T3)** | **160명** | 수술 당일/7일차/14일차 안내가 몇 분 간격 몰림 — **worst case** |
| 2건 (T1+T2) | 1명 (id=672) | T3 는 Solapi 실패로 미발송 |
| 0건 (실패/CANCELED 만) | 21명 | 피해 없음 |

#### 피해 특징
- 160명이 **"수술 당일 안내 (T1)" 를 수술한 지 2주 가까이 지난 시점에 받음** → 톤 어색함 (가장 체감 큰 UX 손상).
- T2 (7일차) · T3 (14일차) 는 상대적으로 어색함 적음.
- 모든 발송은 03:35~04:30 사이 몇 분 간격.
- 피해자 리스트 추출 쿼리는 §5.

### Table 4 (추가 발견) — 10/1 10:00 정상 발송 125건 묶임

사고로 일일 발송 한도 500 조기 소진 → 10/1 10:00 scheduled 였던 147건 중:
- DONE 18 (한도 도달 전 통과)
- CANCELED 4
- **PENDING 125 (한도 걸림, 묶임)** — T1 15 + T2 110

#### 발송 원복 방법
`SMS_DISPATCH_DAILY_LIMIT=700` 임시 상향 → 백엔드 재배포 → `batch-size:50` × 3 사이클 (약 15분) 안에 125건 자동 소비. **다음 날 반드시 500 으로 복구** (사고 시 피해 상한 목적).

대안: 자정 넘기면 `countDoneToday` 리셋 → 10/2 아침 폴러가 묶인 PENDING 흡수. T1 15건이 하루 지연되는 어색함만 감수하면 운영 조작 불필요.

---

## 3. Follow-up

### 🚨 긴급 — 11/1 03:30 전 필수
1. **`BatchOrchestrator.runMonthlyReconcile` 에서 SMS 제외**  
   `ALL_DOMAINS` → `MANUAL_ALL_DOMAINS` (기존에 수동 UI 에서는 이미 SMS 제외 중, 자동 월배치도 같은 정책 적용).  
   한 줄 수정 수준. 재발 즉시 차단.

2. (대안·보완) **`enqueueForTarget` 멱등성 키 변경**  
   현재: `(templateCode, scheduled_at)` → clamping 으로 저장값과 계산값 어긋나면 중복 insert.  
   개선: `(target_id, template_code)` 로 좁히고, 상태가 PENDING/PROCESSING/RECEIVED/DONE 중 하나라도 있으면 skip (FAILED/CANCELED 만 재사용).

### 🔍 중기 — 근본 원인 조사
- **왜 9월 데일리 배치가 182명을 놓쳤는가?**
  - `SmsSurgeryImportRepository.findSurgeryRows` SQL 조건 확인
  - 마트(`list_surgery`) 에 수술 데이터가 실시간이 아니라 지연 적재되는지 확인
  - D-1 범위가 아니라 D-N 까지 보는 방식으로 바꿀 수 있는지 검토
- **10월 중에도 비슷하게 적체되는 사람이 있는지 모니터링** — 이 조사 안 하면 11/1 월배치 SMS 를 꺼도 이들에게는 영영 안내가 안 나감.

### 📋 포렌식 (Table 3 완료)
- 피해자 리스트 161명 산출 쿼리는 §5 참조.
- 운영/경영 판단 사항: 해당 환자에게 사과 안내 여부, 문구, 전화/문자 선택.

### 📊 10/1 10:00 묶인 125건 처리
- 옵션 A: `SMS_DISPATCH_DAILY_LIMIT=700` 임시 상향 + 재배포 → 15분 내 자동 소비 → 10/2 **반드시 500 복구**.
- 옵션 B: 그대로 두고 10/2 아침 자연 발송 (T1 15건 하루 지연 감수).

---

## 4. 수정하지 말 것

- **`sms_dispatch_queue` 의 DONE/RECEIVED row 삭제 금지** — Solapi 웹훅이 늦게 돌아오면 `findLatestReceivedId(targetId, templateCode)` 가 엉뚱한 row 를 집어 상태 꼬임.
- **`[POLLUTED_RECONCILE_20261001]` 태그 제거 금지** — 포렌식·사후 추적용. 코드 로직은 이 태그를 참조하지 않음.
- **sms_target 신규 182건 삭제·HOLD 금지** — 환자 레코드 손실 또는 의도치 않은 향후 안내 차단 유발.
- **데일리 배치 수동 재실행으로 "9월 복구 시도" 금지** — 같은 clamping 버그가 재발.

---

## 5. 참고 쿼리

### 오염 큐 상태 확인
```sql
SELECT q.status, COUNT(*)
FROM sms_dispatch_queue q
JOIN sms_target t ON t.id = q.target_id
WHERE q.created_at >= '2026-10-01 03:30:00'
  AND t.surgery_date >= '2026-09-01'
  AND t.surgery_date <  '2026-10-01'
GROUP BY q.status
ORDER BY q.status;
```

### 전체 PENDING 중복 위험 검증 (0 이어야 함)
```sql
SELECT COUNT(*)
FROM sms_dispatch_queue q
WHERE q.status = 'PENDING'
  AND EXISTS (
    SELECT 1 FROM sms_dispatch_queue p
    WHERE p.target_id    = q.target_id
      AND p.template_code = q.template_code
      AND p.id <> q.id
  );
```

### 식별 태그 점검
```sql
SELECT q.status,
       COUNT(*) FILTER (WHERE q.last_error LIKE '%POLLUTED_RECONCILE_20261001%') AS marked,
       COUNT(*) AS total
FROM sms_dispatch_queue q
JOIN sms_target t ON t.id = q.target_id
WHERE q.created_at >= '2026-10-01 03:30:00'
  AND t.surgery_date >= '2026-09-01'
  AND t.surgery_date <  '2026-10-01'
GROUP BY q.status
ORDER BY q.status;
```

### 11/1 월배치 범위 (영향 없음 확인용)
```sql
-- 11/1 03:30 reconcile 는 range = 10월. 아래 수가 0 이면 사고 피해자가 재대상 아님
SELECT COUNT(*)
FROM sms_target t
WHERE t.surgery_date >= '2026-10-01'
  AND t.surgery_date <  '2026-11-01'
  AND t.id IN (
    SELECT target_id FROM sms_dispatch_queue
    WHERE last_error LIKE '%POLLUTED_RECONCILE_20261001%'
  );
-- 기대: 0
```

### 피해자 리스트 161명 (사과 안내용 CSV 소스)
```sql
SELECT
  t.chart_no,
  t.name,
  t.phone,
  t.surgery_date,
  t.op_type,
  t.surgery_type,
  t.surgery_r,
  t.surgery_l,
  COUNT(l.id)                                                AS messages_received,
  STRING_AGG(l.template_code, ',' ORDER BY l.sent_at)        AS received_tiers,
  MIN(l.sent_at)                                             AS first_sent,
  MAX(l.sent_at)                                             AS last_sent,
  EXTRACT(EPOCH FROM (MAX(l.sent_at) - MIN(l.sent_at)))::int AS seconds_span
FROM sms_send_log l
JOIN sms_target t ON t.id = l.target_id
WHERE t.created_at >= '2026-10-01 03:30:00'
  AND t.surgery_date >= '2026-09-01'
  AND t.surgery_date <  '2026-10-01'
  AND l.sent_at     >= '2026-10-01 03:30:00'
  AND l.sent_at     <  '2026-10-01 06:00:00'
  AND l.status      = 'SUCCESS'
GROUP BY t.id, t.chart_no, t.name, t.phone, t.surgery_date, t.op_type, t.surgery_type, t.surgery_r, t.surgery_l
ORDER BY t.surgery_date ASC, t.chart_no;
-- 결과: 161 행 (수술일 오래된 순 — T1 체감 어색함이 큰 사람 우선)
-- CSV 추출: psql \copy ( ... ) TO '/tmp/victims_20261001.csv' CSV HEADER
```

### 10/1 10:00 묶인 PENDING 125건 상태 확인
```sql
SELECT template_code, COUNT(*)
FROM sms_dispatch_queue
WHERE status = 'PENDING'
  AND scheduled_at = '2026-10-01 10:00:00'
GROUP BY template_code
ORDER BY template_code;
-- 현재: T1=15, T2=110 (총 125)
```

### 오늘 발송 한도 소진 상태
```sql
SELECT COUNT(*) AS done_today
FROM sms_dispatch_queue
WHERE status IN ('RECEIVED', 'DONE')
  AND processed_at >= '2026-10-01 00:00:00'
  AND processed_at <  '2026-10-02 00:00:00';
-- 현재: 500 (한도 도달 → 추가 발송 skip)
```
