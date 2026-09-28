import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf } from '#shared/api/utils'

/**
 * 채널별 수익성 — 화면이 쓰는 값 중 **퍼널 API 에 없던 것**만 담당한다.
 *
 * 수술완료·수납액·전환율·재수술은 `/api/stats/reservation-channel` 이 이미 내려준다.
 * 여기는 CRM 에 존재하지 않아 사람이 입력해야 하는 두 값(광고비·렌즈단가)과,
 * 그 단가로 계산한 채널별 렌즈원가다.
 */

/* ── 채널별 렌즈원가 ── */

export const channelLensCostSchema = z.object({
  channel: z.string(),
  /** 렌즈가 들어가는 수술의 총 안수(양안이면 2) */
  lensEyes: z.number(),
  lensEyesPriced: z.number(),
  /** 단가 미입력 안수. 0 보다 크면 원가·공헌이익은 미완성이다 */
  lensEyesUnpriced: z.number(),
  lensCostManwon: z.number(),
})
export type ChannelLensCost = z.infer<typeof channelLensCostSchema>

/* ── 광고비 ── */

/**
 * 광고 상품 코드. 유입채널이 아니라 **광고를 집행하는 상품**이다.
 * 검색광고는 유입이 홈페이지·인콜·네이버로 흩어져 매출 귀속이 안 되지만,
 * 전체 광고비를 알려면 비용은 기록해야 한다.
 */
export const AD_MEDIA = ['naver_reserve', 'naver_search', 'modoodoc'] as const
export type AdMedia = (typeof AD_MEDIA)[number]

export const adSpendSchema = z.object({
  ym: z.string(),
  media: z.string(),
  amountManwon: z.number(),
})
export type AdSpend = z.infer<typeof adSpendSchema>

/* ── 렌즈 단가 ── */

export const lensCostSchema = z.object({
  /** surgery_op_type() 코드 — icl · tIcl · kpl · tKpl · viva */
  opType: z.string(),
  /** 안(眼) 1개당 매입 단가(만원). 0 이면 미입력 */
  unitCostManwon: z.number(),
})
export type LensCost = z.infer<typeof lensCostSchema>

const lensCostListRes = apiResponseOf(z.array(channelLensCostSchema))
const adSpendListRes = apiResponseOf(z.array(adSpendSchema))
const lensPriceListRes = apiResponseOf(z.array(lensCostSchema))
const savedRes = apiResponseOf(z.object({ saved: z.number() }))

const BASE = '/stats/channel-profit'
const range = (from: string, to: string) =>
  `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`

export const channelProfitApi = {
  getChannelLensCost: async (from: string, to: string): Promise<ChannelLensCost[]> => {
    const res = await api.get<unknown>(`${BASE}/lens-cost?${range(from, to)}`)
    return lensCostListRes.parse(res).data
  },

  getAdSpend: async (ym: string): Promise<AdSpend[]> => {
    const res = await api.get<unknown>(`${BASE}/ad-spend?ym=${encodeURIComponent(ym)}`)
    return adSpendListRes.parse(res).data
  },

  saveAdSpend: async (items: AdSpend[]): Promise<number> => {
    const res = await api.put<unknown>(`${BASE}/ad-spend`, items)
    return savedRes.parse(res).data.saved
  },

  getLensPrices: async (): Promise<LensCost[]> => {
    const res = await api.get<unknown>(`${BASE}/lens-price`)
    return lensPriceListRes.parse(res).data
  },

  saveLensPrices: async (items: LensCost[]): Promise<number> => {
    const res = await api.put<unknown>(`${BASE}/lens-price`, items)
    return savedRes.parse(res).data.saved
  },
}
