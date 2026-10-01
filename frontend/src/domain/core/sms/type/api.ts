import { z } from 'zod'

/**
 * 문자 발송 관리 API — /api/sms-management (ADMIN 전용).
 * 발송은 우리 백엔드가 솔라피 SDK 로 직접 수행하고, 건별 이력이 서버에 쌓인다.
 */

const sendLogSchema = z.object({
  id: z.number(),
  targetId: z.number(),
  templateCode: z.string(),
  templateLabel: z.string(),
  /** 요청 채널 ALIMTALK/SMS — 알림톡 실패 시 문자 대체발송되면 messageType 과 다를 수 있다. */
  requestedChannel: z.string(),
  /** 솔라피 실제 타입(SMS/LMS/ATA …) — 솔라피 메시지 조회와 대사할 때 쓰는 키들. */
  messageType: z.string(),
  solapiGroupId: z.string(),
  solapiMessageId: z.string(),
  statusCode: z.string(),
  /** PENDING(대기) / SUCCESS(완료) / FAILED(실패) — 접수가 아니라 도달 기준. */
  status: z.string(),
  failReason: z.string(),
  sentAt: z.string(),
  sentBy: z.string(),
  /** 단말 도달 시각. 비면 미도달. */
  deliveredAt: z.string(),
  /** 알림톡 실패 → 문자로 대체발송됐는지. */
  replacement: z.boolean(),
})

export const targetSchema = z.object({
  id: z.number(),
  chartNo: z.string(),
  name: z.string(),
  phone: z.string(),
  /** 실제로 보낼 수 있는 번호인지 — false 면 '발송 불가'(더미 번호·형식 오류·빈 값). */
  phoneValid: z.boolean(),
  surgeryDate: z.string(),
  /** 예정일 계산 기준일 — 보통 수술일과 같고, 되살아난 행만 다르다. */
  scheduleBase: z.string(),
  /** 연락처 수정·홀딩 해제로 예정일이 오늘 기준으로 다시 깔린 행. */
  rebased: z.boolean(),
  surgeryType: z.string(),
  /** 수술 종류 코드(smilePro·catMulti·reopLens …) — 마트 surgery_op_type() 분류값. */
  opType: z.string(),
  /** 실제 수술명 우/좌 — 어떤 수술을 받았는지 보고 발송을 판단한다. */
  surgeryR: z.string(),
  surgeryL: z.string(),
  /** SENDABLE(발송 대기) / HOLD(발송 홀딩) */
  status: z.string(),
  /** AUTO(마트 자동 등록) / MANUAL(수동 입력·수정) */
  source: z.string(),
  /**
   * 이 번호가 수신거부 목록에 있는지. 홀딩과 달리 **사람 단위**라 다음 수술에도 계속 막힌다 —
   * 화면은 홀딩과 구분해 보여주고 토글로 풀지 못하게 한다.
   */
  optedOut: z.boolean(),
  logs: z.array(sendLogSchema),
  /**
   * 이 대상의 tier(T1/T2/T3) 별 최신 큐 상태. 리스트가 "예정" 셀을 표시할 때
   * scheduleBase+offset 계산값 대신 이 값을 우선 쓴다 — 재실행/홀딩 해제/오프셋 편집으로
   * 큐 scheduledAt 이 clamp 됐을 때 화면=실제 일치.
   * 큐가 없거나 발송 완료 후 이력만 남은 tier 는 이 맵에 없다(선택적).
   */
  tierQueues: z
    .record(
      z.string(),
      z.object({
        id: z.number(),
        targetId: z.number(),
        templateCode: z.string(),
        scheduledAt: z.string(),
        kind: z.enum(['NOTIFICATION', 'AD']),
        status: z.enum([
          'PENDING',
          'PROCESSING',
          'RECEIVED',
          'DONE',
          'FAILED',
          'CANCELED',
        ]),
        attemptCount: z.number(),
        lastError: z.string().nullish(),
        pickedAt: z.string().nullish(),
        processedAt: z.string().nullish(),
      }),
    )
    .nullish()
    .default({}),
})

/**
 * 차수 × 수술 그룹 슬롯.
 * 같은 1차라도 스마일 D+1 · 렌즈삽입 D+3 · 라섹 D+5 로 시점이 다르고 문구도 다르다.
 */
const templateGroupSchema = z.object({
  groupCode: z.string(),
  groupLabel: z.string(),
  /** 이 그룹에 속한 op_type 코드 — 표가 행마다 그룹을 찾을 때 쓴다. */
  opTypes: z.array(z.string()),
  /** 기준일로부터 며칠 뒤. 그룹마다 다르다. */
  offsetDays: z.number(),
  alimtalkReady: z.boolean(),
  smsReady: z.boolean(),
  /**
   * 지연 발송용 문자 본문 — 재조정된 대상의 2·3차 미리보기에 그대로 쓴다.
   * 1차는 기본 본문과 같은 값(경과 선언이 없어 지연 파생본이 필요 없음).
   */
  smsTextDelayed: z.string().nullish(),
})

export const templateSchema = z.object({
  code: z.string(),
  label: z.string(),
  /** 1 / 2 / 3 */
  tier: z.number(),
  groups: z.array(templateGroupSchema),
})

export const sendResultSchema = z.object({
  requested: z.number(),
  success: z.number(),
  failed: z.number(),
  skipped: z.number(),
  items: z.array(
    z.object({
      targetId: z.number(),
      name: z.string(),
      result: z.string(),
      detail: z.string(),
    }),
  ),
})

export const importResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  skipped: z.number(),
})

/**
 * 오프셋 그리드 한 줄 — 그룹 하나의 1·2·3차 오프셋(일).
 * 응답에는 4행(SMILE·LASIK·LASEK·ICL) 만 온다 — ETC 는 발송 대상이 아니라 편집 불가.
 */
/** 알림톡(NOTIFICATION): 시간 제한 없음. 광고톡(AD): 정보통신망법상 hour 8..20 강제. */
const messageKindSchema = z.enum(['NOTIFICATION', 'AD'])

/** 수신거부 목록 한 줄 — 번호는 마스킹된 형태로만 프론트에 옴(개인정보 보호). */
export const optOutRowSchema = z.object({
  id: z.number(),
  /** "010****1234" 형식. 관리 화면 표시용. 해제는 phone 대신 id 로 한다. */
  phoneMasked: z.string(),
  chartNo: z.string(),
  name: z.string(),
  /** MANUAL(화면 등록) / SOLAPI_080(카카오 080 수신거부 서비스) … */
  source: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
})

export const offsetRowSchema = z.object({
  groupCode: z.string(),
  label: z.string(),
  tier1Offset: z.number(),
  tier2Offset: z.number(),
  tier3Offset: z.number(),
  /** 발송 시각 (HH:mm 문자열) — tier-level 이라 4행 모두 같은 값. 편집 UI 는 첫 행 값만 노출. */
  tier1Time: z.string(),
  tier2Time: z.string(),
  tier3Time: z.string(),
  tier1Kind: messageKindSchema,
  tier2Kind: messageKindSchema,
  tier3Kind: messageKindSchema,
  updatedBy: z.string().nullish(),
  updatedAt: z.string().nullish(),
})

/** 차트번호 조회 결과 — found=false 면 마트에 수술 기록이 없다(직접 입력으로 진행 가능). */
export const lookupSchema = z.object({
  found: z.boolean(),
  alreadyRegistered: z.boolean(),
  chartNo: z.string(),
  name: z.string(),
  phone: z.string(),
  surgeryDate: z.string(),
  surgeryType: z.string(),
  /** 마트 surgery_op_type() 분류 코드 — 수동 추가 시 그대로 저장한다. */
  opType: z.string(),
  surgeryR: z.string(),
  surgeryL: z.string(),
})

/**
 * 자동 발송 큐 상태 (sms_dispatch_queue).
 *   PENDING     발송 대기 (scheduled_at 도래 후 폴러가 잡음)
 *   PROCESSING  폴러가 잡은 상태 (실제 발송 시도 중)
 *   RECEIVED    솔라피 접수 성공 · 웹훅으로 도달 확인 대기 중
 *   DONE        단말 도달 확인됨 (웹훅 SINGLE-REPORT 또는 sync 가 확정)
 *   FAILED      재시도 소진 · 또는 도달 실패 (관리자 재실행 API 로만 되살아남)
 *   CANCELED    홀딩·수신거부·번호무효 등 재개 불가 사유
 */
const queueStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'RECEIVED',
  'DONE',
  'FAILED',
  'CANCELED',
])

export const queueRowSchema = z.object({
  id: z.number(),
  targetId: z.number(),
  templateCode: z.string(),
  scheduledAt: z.string(),
  kind: messageKindSchema,
  status: queueStatusSchema,
  attemptCount: z.number(),
  lastError: z.string().nullish(),
  pickedAt: z.string().nullish(),
  processedAt: z.string().nullish(),
  // 대상 조인 결과 — 실패·취소 재실행 모달이 대상 식별에 쓴다.
  // 옛 큐(대상 삭제)면 null. 큐 상태 카드 등 대상 없이도 되는 경로에서는 무시.
  chartNo: z.string().nullish(),
  name: z.string().nullish(),
  phone: z.string().nullish(),
  surgeryDate: z.string().nullish(),
})

export const queueStatusResponseSchema = z.object({
  counts: z.record(queueStatusSchema, z.number()),
  done_today: z.number(),
})

/**
 * 솔라피에서 조회한 알림톡 템플릿 — 우리 15슬롯 중 templateId 가 채워진 슬롯만 온다.
 *  - status: 검수 상태 (APPROVED · INSPECTING · PENDING · REJECTED)
 *  - found=false: 우리 env 엔 ID 가 있는데 솔라피 계정에서 찾지 못한 경우. errorMessage 확인.
 *  - content: 카카오 승인 본문(원문 그대로). 발송 시 #{name}·#{surgeryDate} 치환됨.
 *  - messageType: BASIC · EXTRA_INFO · CHANNEL_ADD · MIXED
 */
export const solapiTemplateSchema = z.object({
  groupCode: z.string(),
  groupLabel: z.string(),
  tier: z.number(),
  templateLabel: z.string(),
  templateId: z.string(),
  found: z.boolean(),
  status: z.string().nullish(),
  name: z.string().nullish(),
  content: z.string().nullish(),
  messageType: z.string().nullish(),
  categoryCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
})

/**
 * 솔라피 계정 잔액 — 자동 발송 큐 카드에 노출.
 *  - balance:     부가세 제외 실사용 가능액(원)
 *  - point:       포인트(원) — 발송에 우선 소진됨
 *  - deposit:     예치금(원, 부가세 포함) — 솔라피 콘솔의 "잔액"과 일치. 화면은 이 값을 표시한다.
 *  - balanceOnly: 순수 충전 잔고(원)
 *  - configured=false: API 키 미설정 → 화면은 "미설정" 표시
 *  - errorMessage: 조회 실패 사유(configured=true 인데 값이 null 일 때)
 */
export const solapiBalanceSchema = z.object({
  balance: z.number().nullish(),
  point: z.number().nullish(),
  deposit: z.number().nullish(),
  balanceOnly: z.number().nullish(),
  configured: z.boolean(),
  errorMessage: z.string().nullish(),
})

export type SmsSendLog = z.infer<typeof sendLogSchema>
export type SmsTarget = z.infer<typeof targetSchema>
export type SmsTemplate = z.infer<typeof templateSchema>
export type SmsTemplateGroup = z.infer<typeof templateGroupSchema>
export type SmsSendResult = z.infer<typeof sendResultSchema>
export type SmsImportResult = z.infer<typeof importResultSchema>
export type SmsLookup = z.infer<typeof lookupSchema>
export type SmsOffsetRow = z.infer<typeof offsetRowSchema>
export type SmsMessageKind = z.infer<typeof messageKindSchema>
export type SmsOptOutRow = z.infer<typeof optOutRowSchema>
export type SmsQueueStatus = z.infer<typeof queueStatusSchema>
export type SmsQueueRow = z.infer<typeof queueRowSchema>
export type SmsQueueStatusResponse = z.infer<typeof queueStatusResponseSchema>
export type SmsSolapiTemplate = z.infer<typeof solapiTemplateSchema>
export type SmsSolapiBalance = z.infer<typeof solapiBalanceSchema>

export interface SmsOffsetUpdatePayload {
  rows: {
    groupCode: string
    tier1Offset: number
    tier2Offset: number
    tier3Offset: number
  }[]
  /** tier-level 발송 시각 (HH:mm) — 4행 모두 같은 값으로 원자적 갱신. */
  tier1Time: string
  tier2Time: string
  tier3Time: string
  /** tier-level 메시지 종류 — 광고톡이면 hour 8..20 강제, 알림톡은 제한 없음. */
  tier1Kind: SmsMessageKind
  tier2Kind: SmsMessageKind
  tier3Kind: SmsMessageKind
}

export interface SmsTargetRequest {
  /** 필수 */
  chartNo: string
  /** 필수 — 발송에 실제로 쓰이는 값 */
  phone: string
  name: string
  /** 비우면 서버가 등록일(오늘)로 저장한다. */
  surgeryDate: string
  surgeryType: string
  /** 조회로 받은 수술 종류 코드 — 안 보내면 수동 추가 행의 수술 종류가 빈다. */
  opType: string
  surgeryR: string
  surgeryL: string
}

/** 조회 기준 — 수술일 / 발송예정일 / 실제발송일. */
export type SmsQueryBasis = 'SURGERY' | 'SCHEDULED' | 'SENT'
