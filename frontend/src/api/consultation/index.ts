import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf, withQuery } from '#shared/api/utils'

/* ── Monthly (검사 중단 사유 페이지용) ── */

const stopReasonMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  recommendX: z.number(),
  lensImpossible: z.number(),
  keratoconus: z.number(),
  avellino: z.number(),
  glaucoma: z.number(),
  visionChange: z.number(),
  other: z.number(),
  total: z.number(),
})
export type StopReasonMonthlyItem = z.infer<typeof stopReasonMonthlyItemSchema>
const stopReasonResponseSchema = apiResponseOf(z.array(stopReasonMonthlyItemSchema))

/* ── Monthly (백내장 예약률 페이지용) ── */

const cataractReservationRateItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  examCount: z.number(),
  surgeryBookedCount: z.number(),
  reservationRate: z.number(),
})
export type CataractReservationRateItem = z.infer<typeof cataractReservationRateItemSchema>
const cataractReservationRateResponseSchema = apiResponseOf(z.array(cataractReservationRateItemSchema))

/* ── 상담 전환율 페이지용 ── */

const consultationRateItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  // 시력교정
  visionExamCount: z.number(),
  visionCounselCount: z.number(),
  visionSurgeryBooked: z.number(),
  visionActualSurgery: z.number(),
  visionSurgeryRate: z.number(),
  visionCounselRate: z.number(),
  visionCounselRateOneday: z.number().optional(),
  visionCounselRateGeneral: z.number().optional(),
  visionGeneralBookRate: z.number().optional(),
  // 백내장
  cataractExamCount: z.number(),
  cataractSurgeryBooked: z.number(),
  cataractStoppedCount: z.number(),
  cataractSurgeryRate: z.number(),
})

const consultationRateResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(consultationRateItemSchema),
})

export type ConsultationRateItem = z.infer<typeof consultationRateItemSchema>

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
