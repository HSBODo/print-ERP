import { api } from '#shared/api/client'

import {
  reservationKpiResponseSchema,
  reservationMonthlyResponseSchema,
  reservationOverallResponseSchema,
  reservationChangeResponseSchema,
  type ReservationChangeResult,
  reservationChangeDailyResponseSchema,
  type ReservationChangeDailyResult,
  reservationListResponseSchema,
  type ReservationListResult,
  type ReservationListHomepageResult,
  reservationListHomepageResponseSchema,
} from './type/api'

export const reservationApi = {
  getReservationMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/reservation/monthly', { params: { years } })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationKpi: async (years: number[]) => {
    const { data } = await api.get('/stats/reservation/kpi', { params: { years } })
    return reservationKpiResponseSchema.parse(data).data
  },

  getReservationTrend: async (years: number[]) => {
    const { data } = await api.get('/stats/reservation/trend', { params: { years } })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationComposition: async (years: number[]) => {
    const { data } = await api.get('/stats/reservation/composition', { params: { years } })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationOverallMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/reservation-overall/monthly', { params: { years } })
    return reservationOverallResponseSchema.parse(data).data
  },
  getReservationChanges: async (from: string, to: string): Promise<ReservationChangeResult> => {
    const { data } = await api.get('/reservation-change', { params: { from, to } })
    return reservationChangeResponseSchema.parse(data).data
  },
  getReservationChangeDailyCounts: async (from: string, to: string): Promise<ReservationChangeDailyResult> => {
    const { data } = await api.get('/reservation-change/daily', { params: { from, to } })
    return reservationChangeDailyResponseSchema.parse(data).data
  },
  getReservationList: async (from: string, to: string): Promise<ReservationListResult> => {
    const { data } = await api.get('/reservation-list', { params: { from, to } })
    return reservationListResponseSchema.parse(data).data
  },
  getReservationListHomepage: async (
    from: string,
    to: string,
  ): Promise<ReservationListHomepageResult> => {
    const { data } = await api.get('/reservation-list-homepage', { params: { from, to } })
    return reservationListHomepageResponseSchema.parse(data).data
  },
}
