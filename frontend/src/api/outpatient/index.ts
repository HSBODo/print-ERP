import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf, withQuery } from '#shared/api/utils'

/* ── Monthly (외래수 페이지용) ── */

const outpatientCountMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  outpatientCount: z.number().nullable(),
  total: z.number().nullable().optional(),
})
export type OutpatientCountMonthlyItem = z.infer<typeof outpatientCountMonthlyItemSchema>
const outpatientCountResponseSchema = apiResponseOf(z.array(outpatientCountMonthlyItemSchema))

export const outpatientApi = {
  getOutpatientCountMonthly: async (years: number[]) =>
    outpatientCountResponseSchema.parse(await api.get<unknown>(withQuery('/stats/outpatient-count/monthly', { years }))).data,
}
