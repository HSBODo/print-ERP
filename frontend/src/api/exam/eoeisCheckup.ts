import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

const eoeisCheckupRowSchema = z.object({
  operatorName: z.string(),
  deviceName: z.string(),
  date: z.string(),
  count: z.number(),
})

const eoeisCheckupResultSchema = z.object({
  rows: z.array(eoeisCheckupRowSchema),
  scores: z.record(z.string(), z.number()),
})

export type EoeisCheckupRow = z.infer<typeof eoeisCheckupRowSchema>
export type EoeisCheckupResult = z.infer<typeof eoeisCheckupResultSchema>

export const eoeisCheckupApi = {
  getStats: async (from: string, to: string): Promise<EoeisCheckupResult> => {
    const response = await api.get<unknown>(withQuery('/eoeis-checkup', { from, to }))
    return apiResponseOf(eoeisCheckupResultSchema).parse(response).data
  },
}
