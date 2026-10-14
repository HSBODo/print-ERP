import { api } from '#shared/api/client'

import {
  overallExamMonthlyResponseSchema,
  overallExamWeeklyResponseSchema,
} from './type/api'

export const overallApi = {
  getOverallExamWeekly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/overall-exam/weekly', {
      params: { years },
      signal,
    })
    return overallExamWeeklyResponseSchema.parse(data).data
  },
  getOverallExamMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/overall-exam/monthly', {
      params: { years },
      signal,
    })
    return overallExamMonthlyResponseSchema.parse(data).data
  },
}
