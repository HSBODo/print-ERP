import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf, withQuery } from '#shared/api/utils'

import {
  targetSchema,
  templateSchema,
  sendResultSchema,
  importResultSchema,
  optOutRowSchema,
  offsetRowSchema,
  lookupSchema,
  queueRowSchema,
  queueStatusResponseSchema,
  solapiTemplateSchema,
  solapiBalanceSchema,
  type SmsTarget,
  type SmsTemplate,
  type SmsSendResult,
  type SmsImportResult,
  type SmsLookup,
  type SmsOffsetRow,
  type SmsOptOutRow,
  type SmsQueueStatus,
  type SmsQueueRow,
  type SmsQueueStatusResponse,
  type SmsSolapiTemplate,
  type SmsSolapiBalance,
  type SmsOffsetUpdatePayload,
  type SmsTargetRequest,
  type SmsQueryBasis,
} from './type/api'

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
