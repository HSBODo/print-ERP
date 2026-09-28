import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  stopReasonResponseSchema,
  cataractReservationRateResponseSchema,
  consultationRateResponseSchema,
} from './type/api'

export const consultationApi = {
  getConsultationRate: async (years: number[]) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(withQuery('/stats/consultation-rate', { years }))).data,

  getStopReasonMonthly: async (years: number[]) =>
    stopReasonResponseSchema.parse(await api.get<unknown>(withQuery('/stats/stop-reason/monthly', { years }))).data,

  getCataractReservationRateTrend: async (years: number[], category: 'vision' | 'cataract' = 'cataract') =>
    cataractReservationRateResponseSchema.parse(await api.get<unknown>(withQuery('/stats/cataract-reservation-rate/trend', { years, category }))).data,

  getConsultationRateKpi: async (years: number[]) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(withQuery('/stats/consultation-rate/kpi', { years }))).data,

  getConsultationRateTrend: async (years: number[]) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(withQuery('/stats/consultation-rate/trend', { years }))).data,

  getConsultationRateComposition: async (years: number[]) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(withQuery('/stats/consultation-rate/composition', { years }))).data,
}
