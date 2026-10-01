import { api } from '#shared/api/client'

import {
  type AccumulatedEyeItem,
  accumulatedEyeResponseSchema,
  type AccumulatedEyesField,
  accumulatedEyeTotalSchema,
  type AdSpend,
  adSpendListRes,
  type ChannelLensCost,
  type LensCost,
  lensCostListRes,
  lensPriceListRes,
  opTypeResponseSchema,
  type ReservationChannelFunnelItem,
  reservationChannelFunnelResponseSchema,
  type ReservationChannelOpType,
  savedRes,
} from './type/api'

const CHANNEL_PROFIT_BASE = '/stats/channel-profit'

export const marketingApi = {
  getAccumulatedEyes: async (
    from: string,
    to: string,
    query: string,
    field: AccumulatedEyesField = 'all',
    signal?: AbortSignal,
  ): Promise<AccumulatedEyeItem[]> => {
    const { data } = await api.get<unknown>('/accumulated-eyes', {
      params: { from, to, query, field },
      signal,
    })
    return accumulatedEyeResponseSchema.parse(data).data
  },
  /** 총 누적 안수 (마트 max). 홈 대시보드 KPI. */
  getAccumulatedEyesTotal: async (signal?: AbortSignal): Promise<number> => {
    const { data } = await api.get<unknown>('/accumulated-eyes/total', { signal })
    return accumulatedEyeTotalSchema.parse(data).data.total
  },
  getChannelLensCost: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ChannelLensCost[]> => {
    const { data } = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/lens-cost`, {
      params: { from, to },
      signal,
    })
    return lensCostListRes.parse(data).data
  },

  getAdSpend: async (ym: string, signal?: AbortSignal): Promise<AdSpend[]> => {
    const { data } = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/ad-spend`, {
      params: { ym },
      signal,
    })
    return adSpendListRes.parse(data).data
  },

  saveAdSpend: async (items: AdSpend[]): Promise<number> => {
    const { data } = await api.put<unknown>(`${CHANNEL_PROFIT_BASE}/ad-spend`, items)
    return savedRes.parse(data).data.saved
  },

  getLensPrices: async (signal?: AbortSignal): Promise<LensCost[]> => {
    const { data } = await api.get<unknown>(`${CHANNEL_PROFIT_BASE}/lens-price`, {
      signal,
    })
    return lensPriceListRes.parse(data).data
  },

  saveLensPrices: async (items: LensCost[]): Promise<number> => {
    const { data } = await api.put<unknown>(`${CHANNEL_PROFIT_BASE}/lens-price`, items)
    return savedRes.parse(data).data.saved
  },
  getReservationChannelFunnel: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationChannelFunnelItem[]> => {
    const { data } = await api.get<unknown>('/stats/reservation-channel', {
      params: { from, to },
      signal,
    })
    return reservationChannelFunnelResponseSchema.parse(data).data
  },

  getReservationChannelOpTypes: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationChannelOpType[]> => {
    const { data } = await api.get<unknown>('/stats/reservation-channel/op-types', {
      params: { from, to },
      signal,
    })
    return opTypeResponseSchema.parse(data).data
  },
}
