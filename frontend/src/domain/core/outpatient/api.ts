import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  outpatientCountResponseSchema,
  outpatientListResponseSchema,
  type OutpatientListItem,
} from './type/api'

export const outpatientApi = {
  getOutpatientCountMonthly: async (years: number[]) =>
    outpatientCountResponseSchema.parse(await api.get<unknown>(withQuery('/stats/outpatient-count/monthly', { years }))).data,
  getOutpatientList: async (from: string, to: string): Promise<OutpatientListItem[]> => {
    const res = await api.get<unknown>(withQuery('/outpatient-list', { from, to }))
    return outpatientListResponseSchema.parse(res).data
  },
}
