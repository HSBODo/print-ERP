import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  overallExamWeeklyResponseSchema,
  overallExamMonthlyResponseSchema,
} from './type/api'

export const overallApi = {
  getOverallExamWeekly: async (years: number[]) =>
    overallExamWeeklyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/overall-exam/weekly', { years }))).data,
  getOverallExamMonthly: async (years: number[]) =>
    overallExamMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/overall-exam/monthly', { years }))).data,
}
