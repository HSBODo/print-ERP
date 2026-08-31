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
  // V17 이전 이력·실패·진행중 이력은 null. 성공 이력은 테이블명 → upsert 행 수.
  tableStats: z.record(z.string(), z.number()).nullable().optional(),
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
  | 'ACCUMULATED_EYES'
  | 'RESERVATION'
  | 'EXAM'
  | 'CONSULTATION'
  | 'OUTPATIENT'
  | 'OVERALL'
  | 'ETC'
  | 'SMS'

export const batchAdminApi = {
  listRunLogs: async (limit = 50): Promise<BatchRunLog[]> =>
    runLogsResponseSchema.parse(await api.get<unknown>(withQuery('/admin/batch/run-logs', { limit }))),

  rerun: async (from: string, to: string, domain: BatchDomain = 'ALL') =>
    rerunResponseSchema.parse(
      await api.post<unknown>(withQuery('/admin/batch/rerun', { from, to, domain }), null),
    ),
}
