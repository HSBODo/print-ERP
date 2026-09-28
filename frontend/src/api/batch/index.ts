import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf } from '#shared/api/utils'

const lastSuccessSchema = z.object({
  targetDate: z.string(),  // YYYY-MM-DD
  finishedAt: z.string(),  // ISO datetime
})

const lastSuccessResponseSchema = apiResponseOf(lastSuccessSchema.nullable())

export type BatchLastSuccess = z.infer<typeof lastSuccessSchema>

export const batchApi = {
  lastSuccess: async (): Promise<BatchLastSuccess | null> =>
    lastSuccessResponseSchema.parse(await api.get<unknown>('/batch/last-success')).data,
}
