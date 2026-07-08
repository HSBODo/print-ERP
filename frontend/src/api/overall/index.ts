import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/* ── Weekly (주간 검사자 종합지표 페이지용) ── */

const overallExamWeeklyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  week: z.number(),
  partial: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  totalExam: z.number(),
  introGeneral: z.number(),
  introCustomer: z.number(),
  introStaff: z.number(),
  jobOffice: z.number(),
  jobStudent: z.number(),
  jobEtc: z.number(),
  visionBooked: z.number(),
  cataractTotal: z.number(),
  cataractOnly: z.number(),
  cataractBooked: z.number(),
  stopCount: z.number(),
  visionExam: z.number(),
  dreamlens: z.number(),
  oneDay: z.number(),
  oneDayBooked: z.number(),
})
export type OverallExamWeeklyItem = z.infer<typeof overallExamWeeklyItemSchema>
const overallExamWeeklyResponseSchema = apiResponseOf(z.array(overallExamWeeklyItemSchema))

/* ── Monthly (월별 검사자 종합지표 페이지용, 2026+ 만 반환. 24·25 는 프론트 하드코딩) ── */

const overallExamMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  partial: z.boolean(),
  totalExam: z.number(),
  introGeneral: z.number(),
  introCustomer: z.number(),
  introStaff: z.number(),
  jobOffice: z.number(),
  jobStudent: z.number(),
  jobEtc: z.number(),
  visionBooked: z.number(),
  cataractTotal: z.number(),
  cataractOnly: z.number(),
  cataractBooked: z.number(),
  stopCount: z.number(),
  visionExam: z.number(),
  dreamlens: z.number(),
  oneDay: z.number(),
  oneDayBooked: z.number(),
})
export type OverallExamMonthlyItem = z.infer<typeof overallExamMonthlyItemSchema>
const overallExamMonthlyResponseSchema = apiResponseOf(z.array(overallExamMonthlyItemSchema))

export const overallApi = {
  getOverallExamWeekly: async (years: number[]) =>
    overallExamWeeklyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/overall-exam/weekly', { years }))).data,
  getOverallExamMonthly: async (years: number[]) =>
    overallExamMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/overall-exam/monthly', { years }))).data,
}
