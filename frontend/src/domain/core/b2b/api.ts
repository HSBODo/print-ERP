import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  b2bRevenueResponseSchema,
} from './type/api'

export const b2bApi = {
  getB2bRevenueMonthly: async (years: number[]) =>
    b2bRevenueResponseSchema.parse(await api.get<unknown>(withQuery('/stats/b2b-revenue', { years }))).data,
}
