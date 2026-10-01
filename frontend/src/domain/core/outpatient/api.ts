import { api } from '#shared/api/client'

import {
  outpatientCountResponseSchema,
  type OutpatientListItem,
  outpatientListResponseSchema,
} from './type/api'

export const outpatientApi = {
  getOutpatientCountMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/outpatient-count/monthly', {
      params: { years },
      signal,
    })
    return outpatientCountResponseSchema.parse(data).data
  },
  getOutpatientList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<OutpatientListItem[]> => {
    const { data } = await api.get<unknown>('/outpatient-list', {
      params: { from, to },
      signal,
    })
    return outpatientListResponseSchema.parse(data).data
  },
}
