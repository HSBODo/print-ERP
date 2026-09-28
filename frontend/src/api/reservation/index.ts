import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf, withQuery } from '#shared/api/utils'

/* ── KPI (예약 KPI 카드용) ── */

const reservationKpiItemSchema = z.object({
  year: z.number(), surgery: z.number(), outpatient: z.number(),
  dreamlens: z.number(), total: z.number(),
})
export type ReservationKpiItem = z.infer<typeof reservationKpiItemSchema>
const reservationKpiResponseSchema = apiResponseOf(z.array(reservationKpiItemSchema))

/* ── Monthly (예약 건수 페이지용) ── */

const reservationMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(), surgery: z.number(),
  outpatient: z.number(), dreamlens: z.number(), total: z.number(),
})
export type ReservationMonthlyItem = z.infer<typeof reservationMonthlyItemSchema>
const reservationMonthlyResponseSchema = apiResponseOf(z.array(reservationMonthlyItemSchema))

/* ── Monthly (예약 종합 페이지용) ── */

const reservationOverallMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  reservations: z.number().nullable(),
  online: z.number().nullable(),
  call: z.number().nullable(),
  total: z.number().nullable().optional(),
})
export type ReservationOverallMonthlyItem = z.infer<typeof reservationOverallMonthlyItemSchema>
const reservationOverallResponseSchema = apiResponseOf(z.array(reservationOverallMonthlyItemSchema))

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
}
