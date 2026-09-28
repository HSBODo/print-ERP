import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  type AccumulatedEyeItem,
  accumulatedEyeResponseSchema,
  type AccumulatedEyesField,
  accumulatedEyeTotalSchema,
  type ChannelLensCost,
  type AdSpend,
  type LensCost,
  lensCostListRes,
  adSpendListRes,
  lensPriceListRes,
  savedRes,
  type ReservationChannelFunnelItem,
  reservationChannelFunnelResponseSchema,
  type ReservationChannelOpType,
  opTypeResponseSchema,
} from './type/api'

const CHANNEL_PROFIT_BASE = '/stats/channel-profit'
const range = (from: string, to: string) =>
  `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`

export const marketingApi = {
  getAccumulatedEyes: async (
    from: string,
    to: string,
    query: string,
    field: AccumulatedEyesField = 'all',
  ): Promise<AccumulatedEyeItem[]> => {
    const res = await api.get<unknown>(
      withQuery('/accumulated-eyes', { from, to, query, field }),
    )
    return accumulatedEyeResponseSchema.parse(res).data
  },
  /** 총 누적 안수 (마트 max). 홈 대시보드 KPI. */
  getAccumulatedEyesTotal: async (): Promise<number> => {
    const res = await api.get<unknown>('/accumulated-eyes/total')
    return accumulatedEyeTotalSchema.parse(res).data.total
  },
  getChannelLensCost: async (from: string, to: string): Promise<ChannelLensCost[]> => {
    const res = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/lens-cost?${range(from, to)}`)
    return lensCostListRes.parse(res).data
  },

  getAdSpend: async (ym: string): Promise<AdSpend[]> => {
    const res = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/ad-spend?ym=${encodeURIComponent(ym)}`)
    return adSpendListRes.parse(res).data
  },

  saveAdSpend: async (items: AdSpend[]): Promise<number> => {
    const res = await api.put<unknown>(`${CHANNEL_PROFIT_BASE}/ad-spend`, items)
    return savedRes.parse(res).data.saved
  },

  getLensPrices: async (): Promise<LensCost[]> => {
    const res = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/lens-price`)
    return lensPriceListRes.parse(res).data
  },

  saveLensPrices: async (items: LensCost[]): Promise<number> => {
    const res = await api.put<unknown>(`${CHANNEL_PROFIT_BASE}/lens-price`, items)
    return savedRes.parse(res).data.saved
  },
  getReservationChannelFunnel: async (from: string, to: string): Promise<ReservationChannelFunnelItem[]> => {
    const res = await api.get<unknown>(
      `/stats/reservation-channel?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return reservationChannelFunnelResponseSchema.parse(res).data
  },

  getReservationChannelOpTypes: async (from: string, to: string): Promise<ReservationChannelOpType[]> => {
    const res = await api.get<unknown>(
      `/stats/reservation-channel/op-types?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return opTypeResponseSchema.parse(res).data
  },
}
