import { api } from '#shared/api/client'

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

export const marketingApi = {
  getAccumulatedEyes: async (
    from: string,
    to: string,
    query: string,
    field: AccumulatedEyesField = 'all',
  ): Promise<AccumulatedEyeItem[]> => {
    const { data } = await api.get('/accumulated-eyes', { params: { from, to, query, field } })
    return accumulatedEyeResponseSchema.parse(data).data
  },
  /** 총 누적 안수 (마트 max). 홈 대시보드 KPI. */
  getAccumulatedEyesTotal: async (): Promise<number> => {
    const { data } = await api.get('/accumulated-eyes/total')
    return accumulatedEyeTotalSchema.parse(data).data.total
  },
  getChannelLensCost: async (from: string, to: string): Promise<ChannelLensCost[]> => {
    const { data } = await api.get(`${CHANNEL_PROFIT_BASE}/lens-cost`, { params: { from, to } })
    return lensCostListRes.parse(data).data
  },

  getAdSpend: async (ym: string): Promise<AdSpend[]> => {
    const { data } = await api.get(`${CHANNEL_PROFIT_BASE}/ad-spend`, { params: { ym } })
    return adSpendListRes.parse(data).data
  },

  saveAdSpend: async (items: AdSpend[]): Promise<number> => {
    const { data } = await api.put(`${CHANNEL_PROFIT_BASE}/ad-spend`, items)
    return savedRes.parse(data).data.saved
  },

  getLensPrices: async (): Promise<LensCost[]> => {
    const { data } = await api.get(`${CHANNEL_PROFIT_BASE}/lens-price`)
    return lensPriceListRes.parse(data).data
  },

  saveLensPrices: async (items: LensCost[]): Promise<number> => {
    const { data } = await api.put(`${CHANNEL_PROFIT_BASE}/lens-price`, items)
    return savedRes.parse(data).data.saved
  },
  getReservationChannelFunnel: async (from: string, to: string): Promise<ReservationChannelFunnelItem[]> => {
    const { data } = await api.get('/stats/reservation-channel', { params: { from, to } })
    return reservationChannelFunnelResponseSchema.parse(data).data
  },

  getReservationChannelOpTypes: async (from: string, to: string): Promise<ReservationChannelOpType[]> => {
    const { data } = await api.get('/stats/reservation-channel/op-types', { params: { from, to } })
    return opTypeResponseSchema.parse(data).data
  },
}
