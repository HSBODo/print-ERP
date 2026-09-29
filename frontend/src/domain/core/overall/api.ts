import { api } from '#shared/api/client'

import {
  overallExamWeeklyResponseSchema,
  overallExamMonthlyResponseSchema,
} from './type/api'

export const overallApi = {
  getOverallExamWeekly: async (years: number[]) => {
    const { data } = await api.get('/stats/overall-exam/weekly', { params: { years } })
    return overallExamWeeklyResponseSchema.parse(data).data
  },
  getOverallExamMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/overall-exam/monthly', { params: { years } })
    return overallExamMonthlyResponseSchema.parse(data).data
  },
}
