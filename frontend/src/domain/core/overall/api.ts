import { api } from '#shared/api/client'

import {
  overallExamWeeklyResponseSchema,
  overallExamMonthlyResponseSchema,
} from './type/api'

export const overallApi = {
  getOverallExamWeekly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/overall-exam/weekly', {
      params: { years },
      signal,
    })
    return overallExamWeeklyResponseSchema.parse(data).data
  },
  getOverallExamMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/overall-exam/monthly', {
      params: { years },
      signal,
    })
    return overallExamMonthlyResponseSchema.parse(data).data
  },
}
