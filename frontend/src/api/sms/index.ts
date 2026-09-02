import { z } from 'zod'
import { api } from '../client'
import { apiResponseOf, withQuery } from '../_shared'

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

const targetSchema = z.object({
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
})

const templateSchema = z.object({
  code: z.string(),
  label: z.string(),
  /** 1 / 2 / 3 */
  tier: z.number(),
  groups: z.array(templateGroupSchema),
})

const sendResultSchema = z.object({
  requested: z.number(),
  success: z.number(),
  failed: z.number(),
  skipped: z.number(),
  items: z.array(z.object({
    targetId: z.number(),
    name: z.string(),
    result: z.string(),
    detail: z.string(),
  })),
})

const importResultSchema = z.object({ created: z.number(), updated: z.number(), skipped: z.number() })

/**
 * 오프셋 그리드 한 줄 — 그룹 하나의 1·2·3차 오프셋(일).
 * 응답에는 4행(SMILE·LASIK·LASEK·ICL) 만 온다 — ETC 는 발송 대상이 아니라 편집 불가.
 */
/** 알림톡(NOTIFICATION): 시간 제한 없음. 광고톡(AD): 정보통신망법상 hour 8..20 강제. */
const messageKindSchema = z.enum(['NOTIFICATION', 'AD'])

/** 수신거부 목록 한 줄 — 번호는 마스킹된 형태로만 프론트에 옴(개인정보 보호). */
const optOutRowSchema = z.object({
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

const offsetRowSchema = z.object({
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
const lookupSchema = z.object({
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
const queueStatusSchema = z.enum(['PENDING', 'PROCESSING', 'RECEIVED', 'DONE', 'FAILED', 'CANCELED'])

const queueRowSchema = z.object({
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
})

const queueStatusResponseSchema = z.object({
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
const solapiTemplateSchema = z.object({
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
const solapiBalanceSchema = z.object({
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
  rows: Array<{
    groupCode: string
    tier1Offset: number
    tier2Offset: number
    tier3Offset: number
  }>
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

export const smsApi = {
  async lookup(chartNo: string): Promise<SmsLookup> {
    const res = await api.get(withQuery('/sms-management/lookup', { chartNo }))
    return apiResponseOf(lookupSchema).parse(res).data
  },

  async getTargets(from: string, to: string, basis: SmsQueryBasis = 'SURGERY', templateCode?: string): Promise<SmsTarget[]> {
    const res = await api.get(withQuery('/sms-management/targets', { from, to, basis, templateCode }))
    return apiResponseOf(z.array(targetSchema)).parse(res).data
  },

  async getTemplates(): Promise<SmsTemplate[]> {
    const res = await api.get('/sms-management/templates')
    return apiResponseOf(z.array(templateSchema)).parse(res).data
  },

  /**
   * 솔라피 알림톡 템플릿 조회 — 우리 env 에 templateId 가 채워진 슬롯만 카카오 승인
   * 상태·본문과 함께 돌려준다. API 키 미설정 시 빈 배열. 관리자 "템플릿" 모달용.
   */
  async getSolapiTemplates(): Promise<SmsSolapiTemplate[]> {
    const res = await api.get('/sms-management/solapi-templates')
    return apiResponseOf(z.array(solapiTemplateSchema)).parse(res).data
  },

  /**
   * 솔라피 계정 잔액 조회 — 자동 발송 큐 카드에 노출.
   * API 키 미설정이면 configured=false 로 반환(500 안 던짐).
   */
  async getSolapiBalance(): Promise<SmsSolapiBalance> {
    const res = await api.get('/sms-management/solapi-balance')
    return apiResponseOf(solapiBalanceSchema).parse(res).data
  },

  async createTarget(request: SmsTargetRequest): Promise<SmsTarget> {
    const res = await api.post('/sms-management/targets', request)
    return apiResponseOf(targetSchema).parse(res).data
  },

  async updateTarget(id: number, request: SmsTargetRequest): Promise<SmsTarget> {
    const res = await api.put(`/sms-management/targets/${id}`, request)
    return apiResponseOf(targetSchema).parse(res).data
  },

  async changeStatus(id: number, value: 'SENDABLE' | 'HOLD'): Promise<SmsTarget> {
    const res = await api.put(withQuery(`/sms-management/targets/${id}/status`, { value }), {})
    return apiResponseOf(targetSchema).parse(res).data
  },

  /**
   * 수신거부 등록 — 선택 대상의 **번호**를 목록에 올리고 같은 번호의 대상을 전부 홀딩한다.
   * 새로 등록된 사람 수를 돌려준다(이미 목록에 있던 번호는 세지 않는다).
   */
  async registerOptOut(targetIds: number[]): Promise<number> {
    const res = await api.post('/sms-management/opt-outs', { targetIds, value: 'HOLD' })
    return apiResponseOf(z.number()).parse(res).data
  },

  /** 선택 대상 일괄 홀딩/해제 — 바뀐 건수를 돌려준다. */
  async changeStatusBulk(targetIds: number[], value: 'SENDABLE' | 'HOLD'): Promise<number> {
    const res = await api.put('/sms-management/targets/status', { targetIds, value })
    return apiResponseOf(z.number()).parse(res).data
  },

  /**
   * 발송 결과 갱신 — 솔라피에 다시 물어 도달시각·대체발송을 채운다. 갱신된 이력 수 반환.
   * ⚠️ 기간은 **발송 시각** 기준이다(수술일 범위가 아니다). 비우면 최근 7일.
   */
  async syncResults(sentFrom?: string, sentTo?: string): Promise<number> {
    const res = await api.post(withQuery('/sms-management/sync', { sentFrom, sentTo }), {})
    return apiResponseOf(z.number()).parse(res).data
  },

  async importTargets(from: string, to: string): Promise<SmsImportResult> {
    const res = await api.post(withQuery('/sms-management/targets/import', { from, to }), {})
    return apiResponseOf(importResultSchema).parse(res).data
  },

  async send(targetIds: number[], templateCode: string, channel: 'ALIMTALK' | 'SMS'): Promise<SmsSendResult> {
    const res = await api.post('/sms-management/send', { targetIds, templateCode, channel })
    return apiResponseOf(sendResultSchema).parse(res).data
  },

  /** 수신거부 목록 조회 — 관리 모달에서 씀. */
  async getOptOuts(): Promise<SmsOptOutRow[]> {
    const res = await api.get('/sms-management/opt-outs')
    return apiResponseOf(z.array(optOutRowSchema)).parse(res).data
  },

  /**
   * 수신거부 해제 (id 기반) — sms_opt_out 에서 물리 삭제.
   * ⚠️ 홀딩(sms_target.status='HOLD')은 자동으로 풀지 않는다 — 지난 차수가 한꺼번에 나가는 사고 방지.
   *    필요하면 관리자가 각 대상을 SENDABLE 로 명시적으로 되돌려야 한다.
   * true 반환: 실제 삭제됨 · false: 이미 없었음.
   */
  async releaseOptOut(id: number): Promise<boolean> {
    const res = await api.delete(`/sms-management/opt-outs/${id}`)
    return apiResponseOf(z.boolean()).parse(res).data
  },

  /** 오프셋 그리드 조회 — 4행(SMILE·LASIK·LASEK·ICL). */
  async getOffsets(): Promise<SmsOffsetRow[]> {
    const res = await api.get('/sms-management/offsets')
    return apiResponseOf(z.array(offsetRowSchema)).parse(res).data
  },

  /** 오프셋 원자적 갱신 — 4행 전부를 함께 보낸다(부분 갱신 미지원). */
  async updateOffsets(payload: SmsOffsetUpdatePayload): Promise<SmsOffsetRow[]> {
    const res = await api.put('/sms-management/offsets', payload)
    return apiResponseOf(z.array(offsetRowSchema)).parse(res).data
  },

  /* ── 자동 발송 큐 (Phase 2) ────────────────────────────────
   * /api/admin/batch/sms/queue/** — hasRole('ADMIN'). postgres-mart 프로파일 전용.
   * 로컬(H2) 개발 환경에서도 배치 인프라가 로드되면 접근 가능.
   */

  /**
   * 큐 상태 요약 — 상태별 카운트 + 완료량(RECEIVED+DONE).
   *
   * from/to (YYYY-MM-DD, to exclusive) 를 넘기면 scheduled_at 축으로 그 범위 카운트를,
   * 비우면 "최신 사이클" 카운트를 돌려준다(하위 호환). done_today 필드는 range 모드에서는
   * 그 범위의 완료량으로 재해석된다.
   */
  async getQueueStatus(range: { from?: string; to?: string } = {}): Promise<SmsQueueStatusResponse> {
    const res = await api.get(withQuery('/admin/batch/sms/queue/status', {
      from: range.from, to: range.to,
    }))
    return apiResponseOf(queueStatusResponseSchema).parse(res).data
  },

  /**
   * 특정 상태 행 목록 — 기본 FAILED 100건. limit 1..500.
   * from/to 는 scheduled_at 기준 YYYY-MM-DD (to 는 exclusive). 생략하면 전체.
   */
  async getQueueRows(
    status: SmsQueueStatus = 'FAILED',
    limit = 100,
    range: { from?: string; to?: string } = {},
  ): Promise<SmsQueueRow[]> {
    const res = await api.get(withQuery('/admin/batch/sms/queue/rows', {
      status, limit, from: range.from, to: range.to,
    }))
    return apiResponseOf(z.array(queueRowSchema)).parse(res).data
  },

  /** 실패·취소 재실행 — attempt_count 리셋 후 PENDING 으로. 리셋된 건수 반환. */
  async retryQueueRows(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0
    const res = await api.post(withQuery('/admin/batch/sms/queue/retry', { ids: ids.join(',') }), {})
    return apiResponseOf(z.number()).parse(res).data
  },

  /** 5분 폴러 즉시 실행 — 개발·긴급용. 처리 통계 반환. */
  async runQueueNow(): Promise<Record<string, number>> {
    const res = await api.post('/admin/batch/sms/queue/run', {})
    return apiResponseOf(z.record(z.string(), z.number())).parse(res).data
  },
}
