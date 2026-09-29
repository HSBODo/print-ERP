import { api } from '#shared/api/client'

import {
  outpatientCountResponseSchema,
  outpatientListResponseSchema,
  type OutpatientListItem,
} from './type/api'

export const outpatientApi = {
  getOutpatientCountMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/outpatient-count/monthly', { params: { years } })
    return outpatientCountResponseSchema.parse(data).data
  },
  getOutpatientList: async (from: string, to: string): Promise<OutpatientListItem[]> => {
    const { data } = await api.get('/outpatient-list', { params: { from, to } })
    return outpatientListResponseSchema.parse(data).data
  },
}
