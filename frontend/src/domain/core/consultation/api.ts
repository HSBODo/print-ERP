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

  getStopReasonMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/stop-reason/monthly', { params: { years } })
    return stopReasonResponseSchema.parse(data).data
  },

  getCataractReservationRateTrend: async (years: number[], category: 'vision' | 'cataract' = 'cataract') => {
    const { data } = await api.get('/stats/cataract-reservation-rate/trend', { params: { years, category } })
    return cataractReservationRateResponseSchema.parse(data).data
  },

  getConsultationRateKpi: async (years: number[]) => {
    const { data } = await api.get('/stats/consultation-rate/kpi', { params: { years } })
    return consultationRateResponseSchema.parse(data).data
  },

  getConsultationRateTrend: async (years: number[]) => {
    const { data } = await api.get('/stats/consultation-rate/trend', { params: { years } })
    return consultationRateResponseSchema.parse(data).data
  },

  getConsultationRateComposition: async (years: number[]) => {
    const { data } = await api.get('/stats/consultation-rate/composition', { params: { years } })
    return consultationRateResponseSchema.parse(data).data
  },
}
