import { api } from '#shared/api/client'

import {
  reservationChangeDailyResponseSchema,
  type ReservationChangeDailyResult,
  reservationChangeResponseSchema,
  type ReservationChangeResult,
  reservationKpiResponseSchema,
  reservationListHomepageResponseSchema,
  type ReservationListHomepageResult,
  reservationListResponseSchema,
  type ReservationListResult,
  reservationMonthlyResponseSchema,
  reservationOverallResponseSchema,
} from './type/api'

export const reservationApi = {
  getReservationMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/reservation/monthly', {
      params: { years },
      signal,
    })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationKpi: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/reservation/kpi', {
      params: { years },
      signal,
    })
    return reservationKpiResponseSchema.parse(data).data
  },

  getReservationTrend: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/reservation/trend', {
      params: { years },
      signal,
    })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationComposition: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/reservation/composition', {
      params: { years },
      signal,
    })
    return reservationMonthlyResponseSchema.parse(data).data
  },

  getReservationOverallMonthly: async (
    years: number[],
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get<unknown>('/stats/reservation-overall/monthly', {
      params: { years },
      signal,
    })
    return reservationOverallResponseSchema.parse(data).data
  },
  getReservationChanges: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationChangeResult> => {
    const { data } = await api.get<unknown>('/reservation-change', {
      params: { from, to },
      signal,
    })
    return reservationChangeResponseSchema.parse(data).data
  },
  getReservationChangeDailyCounts: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationChangeDailyResult> => {
    const { data } = await api.get<unknown>('/reservation-change/daily', {
      params: { from, to },
      signal,
    })
    return reservationChangeDailyResponseSchema.parse(data).data
  },
  getReservationList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationListResult> => {
    const { data } = await api.get<unknown>('/reservation-list', {
      params: { from, to },
      signal,
    })
    return reservationListResponseSchema.parse(data).data
  },
  getReservationListHomepage: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReservationListHomepageResult> => {
    const { data } = await api.get<unknown>('/reservation-list-homepage', {
      params: { from, to },
      signal,
    })
    return reservationListHomepageResponseSchema.parse(data).data
  },
}
