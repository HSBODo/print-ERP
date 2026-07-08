import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

const batchRunLogSchema = z.object({
  id: z.number(),
  jobName: z.string(),
  runType: z.enum(['DAILY', 'MONTHLY_RECONCILE', 'MANUAL']),
  targetFrom: z.string().nullable(),
  targetTo: z.string().nullable(),
  status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']),
  rowsUpserted: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  errorMessage: z.string().nullable(),
})
export type BatchRunLog = z.infer<typeof batchRunLogSchema>

const runLogsResponseSchema = z.array(batchRunLogSchema)

const rerunResponseSchema = z.object({
  ok: z.boolean(),
  from: z.string(),
  to: z.string(),
  domain: z.string().optional(),
  note: z.string().optional(),
})

export type BatchDomain =
  | 'ALL'
  | 'SURGERY'
  | 'RESERVATION'
  | 'EXAM'
  | 'CONSULTATION'
  | 'OUTPATIENT'
  | 'OVERALL'
  | 'ETC'

export const batchAdminApi = {
  listRunLogs: async (limit = 50): Promise<BatchRunLog[]> =>
    runLogsResponseSchema.parse(await api.get<unknown>(withQuery('/admin/batch/run-logs', { limit }))),

  rerun: async (from: string, to: string, domain: BatchDomain = 'ALL') =>
    rerunResponseSchema.parse(
      await api.post<unknown>(withQuery('/admin/batch/rerun', { from, to, domain }), null),
    ),
}
