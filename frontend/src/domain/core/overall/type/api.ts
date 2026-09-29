import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

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
export const overallExamWeeklyResponseSchema = apiResponseOf(z.array(overallExamWeeklyItemSchema))

/* ── Monthly (월별 검사자 종합지표 페이지용, 전 연도 마트 반환) ── */

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
export const overallExamMonthlyResponseSchema = apiResponseOf(z.array(overallExamMonthlyItemSchema))
