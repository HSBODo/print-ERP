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

export type SmsSendLog = z.infer<typeof sendLogSchema>
export type SmsTarget = z.infer<typeof targetSchema>
export type SmsTemplate = z.infer<typeof templateSchema>
export type SmsTemplateGroup = z.infer<typeof templateGroupSchema>
export type SmsSendResult = z.infer<typeof sendResultSchema>
export type SmsImportResult = z.infer<typeof importResultSchema>
export type SmsLookup = z.infer<typeof lookupSchema>

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
}
