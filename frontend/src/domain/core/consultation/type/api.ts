import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

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
export const stopReasonResponseSchema = apiResponseOf(
  z.array(stopReasonMonthlyItemSchema),
)

/* ── Monthly (백내장 예약률 페이지용) ── */

const cataractReservationRateItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  examCount: z.number(),
  surgeryBookedCount: z.number(),
  reservationRate: z.number(),
})
export type CataractReservationRateItem = z.infer<
  typeof cataractReservationRateItemSchema
>
export const cataractReservationRateResponseSchema = apiResponseOf(
  z.array(cataractReservationRateItemSchema),
)

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

export const consultationRateResponseSchema = apiResponseOf(
  z.array(consultationRateItemSchema),
)

export type ConsultationRateItem = z.infer<typeof consultationRateItemSchema>
