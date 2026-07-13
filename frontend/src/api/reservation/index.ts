import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

export interface ReservationStatsParams {
  from: string
  to: string
}

const reservationTrendItemSchema = z.object({
  date: z.string(),
  reservations: z.number(),
  examinations: z.number(),
  cancellations: z.number(),
})

const reservationSourceItemSchema = z.object({
  source: z.enum(['phone', 'naver', 'kakao', 'walkIn', 'referral']),
  label: z.string(),
  count: z.number(),
})

const reservationHourlyItemSchema = z.object({
  slot: z.string(),
  count: z.number(),
})

const reservationStatsResponseSchema = z.object({
  data: z.object({
    summary: z.object({
      totalReservations: z.number(),
      reservationChangeRate: z.number(),
      completedExaminations: z.number(),
      examinationConversionRate: z.number(),
      cancellations: z.number(),
      cancellationRate: z.number(),
      walkInReservations: z.number(),
      walkInShareRate: z.number(),
    }),
    dailyTrend: z.array(reservationTrendItemSchema),
    sourceBreakdown: z.array(reservationSourceItemSchema),
    hourlyDistribution: z.array(reservationHourlyItemSchema),
  }),
  meta: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

export type ReservationStatsResponse = z.infer<typeof reservationStatsResponseSchema>

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
  getReservationStats: async (
    params: ReservationStatsParams
  ): Promise<ReservationStatsResponse> => {
    const response = await api.get<unknown>(
      withQuery('/stats/reservation', { from: params.from, to: params.to }),
    )
    return reservationStatsResponseSchema.parse(response)
  },

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
