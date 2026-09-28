import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

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
  getReservationMonthly: async (years: number[]) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/reservation/monthly', { years }))).data,

  getReservationKpi: async (years: number[]) =>
    reservationKpiResponseSchema.parse(await api.get<unknown>(withQuery('/stats/reservation/kpi', { years }))).data,

  getReservationTrend: async (years: number[]) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/reservation/trend', { years }))).data,

  getReservationComposition: async (years: number[]) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/reservation/composition', { years }))).data,

  getReservationOverallMonthly: async (years: number[]) =>
    reservationOverallResponseSchema.parse(await api.get<unknown>(withQuery('/stats/reservation-overall/monthly', { years }))).data,
  getReservationChanges: async (from: string, to: string): Promise<ReservationChangeResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-change', { from, to }))
    return reservationChangeResponseSchema.parse(res).data
  },
  getReservationChangeDailyCounts: async (from: string, to: string): Promise<ReservationChangeDailyResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-change/daily', { from, to }))
    return reservationChangeDailyResponseSchema.parse(res).data
  },
  getReservationList: async (from: string, to: string): Promise<ReservationListResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-list', { from, to }))
    return reservationListResponseSchema.parse(res).data
  },
  getReservationListHomepage: async (
    from: string,
    to: string,
  ): Promise<ReservationListHomepageResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-list-homepage', { from, to }))
    return reservationListHomepageResponseSchema.parse(res).data
  },
}
