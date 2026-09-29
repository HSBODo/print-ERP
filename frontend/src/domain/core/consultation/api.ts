import { api } from '#shared/api/client'

import {
  stopReasonResponseSchema,
  cataractReservationRateResponseSchema,
  consultationRateResponseSchema,
} from './type/api'

export const consultationApi = {
  getConsultationRate: async (years: number[]) => {
    const { data } = await api.get('/stats/consultation-rate', { params: { years } })
    return consultationRateResponseSchema.parse(data).data
  },

  getStopReasonMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/stop-reason/monthly', { params: { years }, signal })
    return stopReasonResponseSchema.parse(data).data
  },

  getCataractReservationRateTrend: async (years: number[], category: 'vision' | 'cataract', signal?: AbortSignal) => {
    const { data } = await api.get('/stats/cataract-reservation-rate/trend', { params: { years, category }, signal })
    return cataractReservationRateResponseSchema.parse(data).data
  },

  getConsultationRateKpi: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/consultation-rate/kpi', { params: { years }, signal })
    return consultationRateResponseSchema.parse(data).data
  },

  getConsultationRateTrend: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/consultation-rate/trend', { params: { years }, signal })
    return consultationRateResponseSchema.parse(data).data
  },

  getConsultationRateComposition: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/consultation-rate/composition', { params: { years }, signal })
    return consultationRateResponseSchema.parse(data).data
  },
}
