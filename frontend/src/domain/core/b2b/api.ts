import { api } from '#shared/api/client'

import { b2bRevenueResponseSchema } from './type/api'

export const b2bApi = {
  getB2bRevenueMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/b2b-revenue', {
      params: { years },
      signal,
    })
    return b2bRevenueResponseSchema.parse(data).data
  },
}
